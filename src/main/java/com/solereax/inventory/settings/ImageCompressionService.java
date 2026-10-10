package com.solereax.inventory.settings;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.Locale;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageCompressionService {
    public static final long MAX_UPLOAD_SIZE_BYTES = 25L * 1024L * 1024L;
    public static final long TARGET_STORED_SIZE_BYTES = 5L * 1024L * 1024L;

    private static final float MIN_JPEG_QUALITY = 0.55f;
    private static final float JPEG_QUALITY_STEP = 0.12f;
    private static final double SCALE_STEP = 0.85d;
    private static final int MIN_DIMENSION = 1024;

    public PreparedImage prepareForStorage(MultipartFile file) {
        try {
            byte[] originalBytes = file.getBytes();
            String originalExtension = inferExtension(file.getOriginalFilename(), file.getContentType());

            if (originalBytes.length <= TARGET_STORED_SIZE_BYTES) {
                return new PreparedImage(originalBytes, originalExtension);
            }

            BufferedImage sourceImage = readImage(file);
            if (sourceImage == null) {
                return new PreparedImage(originalBytes, originalExtension);
            }

            String outputExtension = sourceImage.getColorModel().hasAlpha() ? "png" : "jpg";
            byte[] compressedBytes = compressImage(sourceImage, outputExtension);
            if (compressedBytes == null || compressedBytes.length == 0) {
                return new PreparedImage(originalBytes, originalExtension);
            }

            if (compressedBytes.length >= originalBytes.length) {
                return new PreparedImage(originalBytes, originalExtension);
            }

            return new PreparedImage(compressedBytes, outputExtension);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to process image.", ex);
        }
    }

    private BufferedImage readImage(MultipartFile file) throws IOException {
        try (InputStream inputStream = file.getInputStream()) {
            return ImageIO.read(inputStream);
        }
    }

    private byte[] compressImage(BufferedImage sourceImage, String outputExtension) throws IOException {
        boolean jpeg = "jpg".equals(outputExtension);
        byte[] bestBytes = null;
        long bestSize = Long.MAX_VALUE;
        double scale = 1.0d;
        float quality = 0.92f;

        for (int attempt = 0; attempt < 8; attempt++) {
            BufferedImage candidate = resize(sourceImage, scale, jpeg);
            byte[] encoded = jpeg ? writeJpeg(candidate, quality) : writePng(candidate);
            if (encoded.length < bestSize) {
                bestSize = encoded.length;
                bestBytes = encoded;
            }
            if (encoded.length <= TARGET_STORED_SIZE_BYTES) {
                return encoded;
            }

            if (candidate.getWidth() <= MIN_DIMENSION || candidate.getHeight() <= MIN_DIMENSION) {
                scale *= SCALE_STEP;
                if (jpeg && quality > MIN_JPEG_QUALITY) {
                    quality = Math.max(MIN_JPEG_QUALITY, quality - JPEG_QUALITY_STEP);
                }
                continue;
            }

            scale *= SCALE_STEP;
            if (jpeg && quality > MIN_JPEG_QUALITY) {
                quality = Math.max(MIN_JPEG_QUALITY, quality - JPEG_QUALITY_STEP);
            }
        }

        return bestBytes;
    }

    private BufferedImage resize(BufferedImage sourceImage, double scale, boolean forceRgb) {
        int width = Math.max(1, (int) Math.round(sourceImage.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(sourceImage.getHeight() * scale));
        int imageType = forceRgb ? BufferedImage.TYPE_INT_RGB : BufferedImage.TYPE_INT_ARGB;
        BufferedImage resized = new BufferedImage(width, height, imageType);
        Graphics2D graphics = resized.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            if (forceRgb) {
                graphics.setComposite(AlphaComposite.Src);
                graphics.setColor(Color.WHITE);
                graphics.fillRect(0, 0, width, height);
            }
            graphics.drawImage(sourceImage, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }
        return resized;
    }

    private byte[] writeJpeg(BufferedImage image, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("No JPEG writer available.");
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(outputStream)) {
            writer.setOutput(imageOutputStream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(Math.clamp(quality, MIN_JPEG_QUALITY, 1.0f));
            }
            writer.write(null, new IIOImage(image, null, null), param);
            imageOutputStream.flush();
            return outputStream.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    private byte[] writePng(BufferedImage image) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("png");
        if (!writers.hasNext()) {
            throw new IllegalStateException("No PNG writer available.");
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(outputStream)) {
            writer.setOutput(imageOutputStream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(0f);
            }
            writer.write(null, new IIOImage(image, null, null), param);
            imageOutputStream.flush();
            return outputStream.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    private String inferExtension(String originalFilename, String contentType) {
        String extension = resolveExtension(originalFilename);
        if (!extension.isBlank()) {
            return extension;
        }
        String normalizedContentType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (normalizedContentType.contains("png")) {
            return "png";
        }
        if (normalizedContentType.contains("gif")) {
            return "gif";
        }
        if (normalizedContentType.contains("webp")) {
            return "webp";
        }
        if (normalizedContentType.contains("avif")) {
            return "avif";
        }
        if (normalizedContentType.contains("jpeg") || normalizedContentType.contains("jpg")) {
            return "jpg";
        }
        return "jpg";
    }

    private String resolveExtension(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int lastDotIndex = originalFilename.lastIndexOf('.');
        if (lastDotIndex < 0 || lastDotIndex == originalFilename.length() - 1) {
            return "";
        }
        return originalFilename.substring(lastDotIndex + 1).toLowerCase(Locale.ROOT);
    }

    public record PreparedImage(byte[] bytes, String extension) {}
}


package com.solereax.inventory.settings;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Random;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class MediaStorageServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void storeImage_compressesLargeJpegBeforeSaving() throws Exception {
        byte[] originalImage = createNoisyJpeg();
        assertTrue(originalImage.length > ImageCompressionService.TARGET_STORED_SIZE_BYTES,
                "Test image should be larger than the target stored size");

        MediaStorageService mediaStorageService = new MediaStorageService(tempDir.toString());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "large-photo.jpg",
                "image/jpeg",
                originalImage
        );

        String url = mediaStorageService.storeImage(file, "products");
        assertTrue(url.endsWith(".jpg"));

        Path storedFile = tempDir.resolve(url.substring("/uploads/".length()));
        assertTrue(Files.exists(storedFile));
        assertTrue(Files.size(storedFile) < originalImage.length, "Stored image should be smaller after compression");
    }

    private byte[] createNoisyJpeg() throws Exception {
        int width = 2400;
        int height = 2400;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Random random = new Random(42L);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                image.setRGB(x, y, random.nextInt(0x01000000) | 0xFF000000);
            }
        }

        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("No JPEG writer available for test setup.");
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(outputStream)) {
            writer.setOutput(imageOutputStream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(1.0f);
            }
            writer.write(null, new IIOImage(image, null, null), param);
            imageOutputStream.flush();
            return outputStream.toByteArray();
        } finally {
            writer.dispose();
        }
    }
}



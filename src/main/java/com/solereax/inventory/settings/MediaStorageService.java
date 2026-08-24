package com.solereax.inventory.settings;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaStorageService {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif", "avif");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final int REQUIRED_IMAGE_WIDTH = 1536;
    private static final int REQUIRED_IMAGE_HEIGHT = 1536;

    private final Path uploadBaseDirectory;

    public MediaStorageService(@Value("${app.media.upload-dir:uploads}") String uploadDir) {
        Path path = Paths.get(uploadDir);
        this.uploadBaseDirectory = path.isAbsolute() ? path.normalize() : Paths.get(System.getProperty("user.dir")).resolve(path).normalize();
    }

    public String storeImage(MultipartFile file, String folderName) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Image size must be 5MB or smaller.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed.");
        }

        String extension = resolveExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Supported formats: jpg, jpeg, png, webp, gif, avif.");
        }

        try (InputStream imageStream = file.getInputStream()) {
            BufferedImage image = ImageIO.read(imageStream);
            if (image == null) {
                throw new IllegalArgumentException("Invalid image file.");
            }
            if (image.getWidth() != REQUIRED_IMAGE_WIDTH || image.getHeight() != REQUIRED_IMAGE_HEIGHT) {
                throw new IllegalArgumentException("Image dimensions must be exactly 1536x1536 pixels.");
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read image file.", ex);
        }

        String safeFolder = folderName.replaceAll("[^a-zA-Z0-9_-]", "");
        String fileName = UUID.randomUUID() + "." + extension;
        Path targetFolder = uploadBaseDirectory.resolve(safeFolder).normalize();
        Path targetFile = targetFolder.resolve(fileName).normalize();
        if (!targetFile.startsWith(uploadBaseDirectory)) {
            throw new IllegalArgumentException("Invalid file path.");
        }

        try {
            Files.createDirectories(targetFolder);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store image.", ex);
        }
        return "/uploads/" + safeFolder + "/" + fileName;
    }

    public String getUploadBaseDirectoryAbsolutePath() {
        return uploadBaseDirectory.toAbsolutePath().toString();
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
}

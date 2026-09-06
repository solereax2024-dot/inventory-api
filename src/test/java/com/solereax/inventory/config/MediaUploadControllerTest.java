package com.solereax.inventory.config;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.solereax.inventory.settings.MediaStorageService;
import java.util.Base64;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

class MediaUploadControllerTest {

    private static final byte[] SAMPLE_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAA" +
            "AAC0lEQVR42mP8/x8AAwMCAO+/XGQAAAAASUVORK5CYII="
    );

    @TempDir
    Path tempDir;

    @Test
    void getUpload_returnsExistingFileWhenPresent() throws Exception {
        Path brandingDir = tempDir.resolve("branding");
        Files.createDirectories(brandingDir);
        Path image = brandingDir.resolve("sample.png");
        Files.write(image, SAMPLE_PNG);

        MediaStorageService mediaStorageService = new MediaStorageService(tempDir.toString());
        MediaUploadController controller = new MediaUploadController(mediaStorageService);

        ResponseEntity<?> response = controller.getUpload("branding/sample.png");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertInstanceOf(org.springframework.core.io.Resource.class, response.getBody());
        assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
        assertArrayEquals(SAMPLE_PNG, ((org.springframework.core.io.Resource) response.getBody()).getInputStream().readAllBytes());
    }

    @Test
    void getUpload_returnsTransparentPlaceholderWhenFileIsMissing() throws Exception {
        MediaStorageService mediaStorageService = new MediaStorageService(tempDir.toString());
        MediaUploadController controller = new MediaUploadController(mediaStorageService);

        ResponseEntity<?> response = controller.getUpload("branding/missing.png");

        assertEquals(200, response.getStatusCode().value());
        assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
        ByteArrayResource body = assertInstanceOf(ByteArrayResource.class, response.getBody());
        assertNotNull(body);
        assertTrue(body.contentLength() > 0);
    }
}




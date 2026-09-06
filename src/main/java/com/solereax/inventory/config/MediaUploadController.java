package com.solereax.inventory.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MediaUploadController {
    private static final byte[] TRANSPARENT_PIXEL_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAA" +
            "AAC0lEQVR42mP8/x8AAwMCAO+/XGQAAAAASUVORK5CYII="
    );

    private final Path uploadBaseDirectory;

    public MediaUploadController(com.solereax.inventory.settings.MediaStorageService mediaStorageService) {
        this.uploadBaseDirectory = Path.of(mediaStorageService.getUploadBaseDirectoryAbsolutePath()).normalize();
    }

    @GetMapping("/uploads/{*path}")
    public ResponseEntity<Resource> getUpload(@PathVariable("path") String path) throws IOException {
        String normalizedPath = path == null ? "" : path.startsWith("/") ? path.substring(1) : path;
        Path resolved = uploadBaseDirectory.resolve(normalizedPath).normalize();
        if (resolved.startsWith(uploadBaseDirectory) && Files.exists(resolved) && Files.isReadable(resolved)) {
            Resource resource = new UrlResource(resolved.toUri());
            String contentType = Files.probeContentType(resolved);
            MediaType mediaType = contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM;
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                    .body(resource);
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(new ByteArrayResource(TRANSPARENT_PIXEL_PNG));
    }
}


package com.solereax.inventory.config;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {
    @GetMapping({
        "/",
        "/collection", "/collection/", "/collection/**",
        "/collections", "/collections/", "/collections/**",
        "/featured", "/featured/", "/featured/**",
        "/feature", "/feature/", "/feature/**",
        "/brands", "/brands/", "/brands/**",
        "/shop", "/shop/", "/shop/**",
        "/reserve", "/reserve/", "/reserve/**",
        "/tetris-game", "/tetris-game/", "/tetris-game/**",
        "/admin", "/admin/", "/admin/**",
        "/admin.html", "/admin.html/", "/admin.html/**"
    })
    public ResponseEntity<Resource> forwardSpaRoutes() {
        Resource resource = new ClassPathResource("static/index.html");
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(resource);
    }
}

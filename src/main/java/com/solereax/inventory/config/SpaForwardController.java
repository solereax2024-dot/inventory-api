package com.solereax.inventory.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {
    @GetMapping({"/shop", "/shop/", "/admin", "/admin/", "/admin.html", "/admin.html/"})
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}

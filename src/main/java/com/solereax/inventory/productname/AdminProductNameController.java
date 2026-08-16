package com.solereax.inventory.productname;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/product-names")
public class AdminProductNameController {
    private final ProductNameService productNameService;

    public AdminProductNameController(ProductNameService productNameService) {
        this.productNameService = productNameService;
    }

    @GetMapping
    public List<String> listProductNames() {
        return productNameService.listProductNames();
    }

    @PostMapping
    public Map<String, String> createProductName(@RequestBody Map<String, String> body) {
        String name = productNameService.createProductName(body.get("name"));
        return Map.of("name", name);
    }

    @DeleteMapping("/by-name")
    public void deleteProductNameByName(@RequestParam("name") String name) {
        productNameService.deleteProductNameByName(name);
    }
}

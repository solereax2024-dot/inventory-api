package com.solereax.inventory.productname;

import java.util.List;
import com.solereax.inventory.shared.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductNameService {
    private final ProductNameRepository productNameRepository;

    public ProductNameService(ProductNameRepository productNameRepository) {
        this.productNameRepository = productNameRepository;
    }

    @Transactional(readOnly = true)
    public List<String> listProductNames() {
        return productNameRepository.findAll()
                .stream()
                .map(ProductName::getName)
                .sorted()
                .toList();
    }

    @Transactional
    public String createProductName(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Product name cannot be empty.");
        }
        if (productNameRepository.existsByNameIgnoreCase(trimmed)) {
            throw new IllegalArgumentException("Product name already exists: " + trimmed);
        }
        ProductName productName = new ProductName();
        productName.setName(trimmed);
        return productNameRepository.save(productName).getName();
    }

    @Transactional
    public void deleteProductNameByName(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Product name cannot be empty.");
        }
        ProductName productName = productNameRepository.findByNameIgnoreCase(trimmed)
                .orElseThrow(() -> new NotFoundException("Product name not found: " + trimmed));
        productNameRepository.delete(productName);
    }
}

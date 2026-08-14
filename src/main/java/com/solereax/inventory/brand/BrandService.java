package com.solereax.inventory.brand;

import com.solereax.inventory.shared.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class BrandService {
    private final BrandRepository brandRepository;

    public BrandService(BrandRepository brandRepository) {
        this.brandRepository = brandRepository;
    }

    @Transactional(readOnly = true)
    public List<String> listBrandNames() {
        return brandRepository.findAll()
                .stream()
                .map(Brand::getName)
                .sorted()
                .toList();
    }

    @Transactional
    public String createBrand(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) throw new IllegalArgumentException("Brand name cannot be empty.");
        if (brandRepository.existsByNameIgnoreCase(trimmed)) {
            throw new IllegalArgumentException("Brand already exists: " + trimmed);
        }
        Brand brand = new Brand();
        brand.setName(trimmed);
        return brandRepository.save(brand).getName();
    }

    @Transactional
    public void deleteBrand(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Brand not found: " + id));
        brandRepository.delete(brand);
    }
}

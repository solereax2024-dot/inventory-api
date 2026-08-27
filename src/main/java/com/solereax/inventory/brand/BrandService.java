package com.solereax.inventory.brand;

import com.solereax.inventory.shared.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@Service
public class BrandService {
    private final BrandRepository brandRepository;

    public BrandService(BrandRepository brandRepository) {
        this.brandRepository = brandRepository;
    }

    public record BrandDto(Long id, String name, String logoUrl) {}

    private BrandDto toDto(Brand brand) {
        return new BrandDto(brand.getId(), brand.getName(), brand.getLogoUrl());
    }

    @Transactional(readOnly = true)
    public List<BrandDto> listBrands() {
        return brandRepository.findAll()
                .stream()
                .map(this::toDto)
                .sorted((a, b) -> a.name().compareToIgnoreCase(b.name()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> listBrandNames() {
        return listBrands().stream().map(BrandDto::name).toList();
    }

    @Transactional
    public BrandDto createBrand(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) throw new IllegalArgumentException("Brand name cannot be empty.");
        if (brandRepository.existsByNameIgnoreCase(trimmed)) {
            throw new IllegalArgumentException("Brand already exists: " + trimmed);
        }
        Brand brand = new Brand();
        brand.setName(trimmed);
        return toDto(brandRepository.save(brand));
    }

    @Transactional
    public BrandDto updateBrandLogo(Long id, String logoUrl) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Brand not found: " + id));
        brand.setLogoUrl(logoUrl);
        return toDto(brandRepository.save(brand));
    }

    @Transactional
    public void deleteBrand(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Brand not found: " + id));
        brandRepository.delete(brand);
    }

    @Transactional
    public void deleteBrandByName(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Brand name cannot be empty.");
        }
        Brand brand = brandRepository.findByNameIgnoreCase(trimmed)
                .orElseThrow(() -> new NotFoundException("Brand not found: " + trimmed));
        brandRepository.delete(brand);
    }
}

package com.solereax.inventory.config;

import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

@Configuration
public class DemoDataConfig {

    @Bean
    CommandLineRunner seedDemoSizeGuideProducts(
            DataSource dataSource,
            ResourceLoader resourceLoader,
            @Value("${app.demo.seed-size-guide-products:false}") boolean seedDemoSizeGuideProducts
    ) {
        return args -> {
            if (!seedDemoSizeGuideProducts) {
                return;
            }

            ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
                    resourceLoader.getResource("classpath:db/demo/seed_demo_size_guide_products.sql")
            );
            populator.execute(dataSource);
        };
    }
}

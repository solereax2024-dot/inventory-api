package com.solereax.inventory.payment;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(PayMongoProperties.class)
public class PayMongoConfig {
}


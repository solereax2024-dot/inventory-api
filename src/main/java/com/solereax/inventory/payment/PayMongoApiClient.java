package com.solereax.inventory.payment;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class PayMongoApiClient {
    private final RestClient restClient;
    private final PayMongoProperties properties;

    public PayMongoApiClient(PayMongoProperties properties) {
        this.restClient = RestClient.builder()
                .baseUrl(properties.resolvedApiBaseUrl())
                .build();
        this.properties = properties;
    }

    public JsonNode createCheckoutSession(JsonNode payload) {
        return restClient.post()
                .uri("/checkout_sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(headers -> headers.setBasicAuth(properties.secretKey(), ""))
                .body(payload)
                .retrieve()
                .body(JsonNode.class);
    }
}


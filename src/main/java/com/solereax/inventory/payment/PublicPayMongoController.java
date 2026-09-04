package com.solereax.inventory.payment;

import com.solereax.inventory.payment.dto.PayMongoCheckoutRequest;
import com.solereax.inventory.payment.dto.PayMongoCheckoutResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/payments/paymongo")
public class PublicPayMongoController {
    private static final String WEBHOOK_TOKEN_HEADER = "X-Paymongo-Webhook-Token";
    private static final String WEBHOOK_SIGNATURE_HEADER = "Paymongo-Signature";
    private static final String WEBHOOK_SIGNATURE_HEADER_FALLBACK = "X-Paymongo-Signature";

    private final PayMongoPaymentService payMongoPaymentService;

    public PublicPayMongoController(PayMongoPaymentService payMongoPaymentService) {
        this.payMongoPaymentService = payMongoPaymentService;
    }

    @PostMapping("/checkout")
    public PayMongoCheckoutResponse createCheckout(@Valid @RequestBody PayMongoCheckoutRequest request) {
        return payMongoPaymentService.createCheckoutSession(request);
    }

    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> processWebhook(
            @RequestBody String payload,
            @RequestHeader(value = WEBHOOK_TOKEN_HEADER, required = false) String webhookToken,
            @RequestHeader(value = WEBHOOK_SIGNATURE_HEADER, required = false) String signature,
            @RequestHeader(value = WEBHOOK_SIGNATURE_HEADER_FALLBACK, required = false) String fallbackSignature
    ) {
        String signatureHeader = signature == null || signature.isBlank() ? fallbackSignature : signature;
        payMongoPaymentService.processWebhook(payload, webhookToken, signatureHeader);
        return Map.of("received", true);
    }
}


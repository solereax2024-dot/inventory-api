package com.solereax.inventory.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.solereax.inventory.order.CustomerOrder;
import com.solereax.inventory.order.CustomerOrderRepository;
import com.solereax.inventory.order.OrderStatus;
import com.solereax.inventory.payment.dto.PayMongoCheckoutRequest;
import com.solereax.inventory.payment.dto.PayMongoCheckoutResponse;
import com.solereax.inventory.shared.NotFoundException;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayMongoPaymentService {
    private static final String PAYMENT_PROVIDER = "PAYMONGO";
    private static final String PAYMENT_STATUS_PENDING = "PENDING";
    private static final String PAYMENT_STATUS_PAID = "PAID";
    private static final String PAYMENT_STATUS_FAILED = "FAILED";
    private static final String PAYMENT_STATUS_EXPIRED = "EXPIRED";

    private final CustomerOrderRepository customerOrderRepository;
    private final PayMongoApiClient payMongoApiClient;
    private final PayMongoProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PayMongoPaymentService(
            CustomerOrderRepository customerOrderRepository,
            PayMongoApiClient payMongoApiClient,
            PayMongoProperties properties
    ) {
        this.customerOrderRepository = customerOrderRepository;
        this.payMongoApiClient = payMongoApiClient;
        this.properties = properties;
    }

    @Transactional
    public PayMongoCheckoutResponse createCheckoutSession(PayMongoCheckoutRequest request) {
        ensureEnabled();
        ensureSecretKeyConfigured();

        CustomerOrder order = customerOrderRepository.findByIdWithItems(request.orderId())
                .orElseThrow(() -> new NotFoundException("Order not found: " + request.orderId()));

        if (order.getStatus() == OrderStatus.PAID || PAYMENT_STATUS_PAID.equalsIgnoreCase(order.getPaymentStatus())) {
            throw new IllegalArgumentException("Order is already marked as paid.");
        }

        BigDecimal totalPrice = order.getTotalPrice();
        if (totalPrice == null || totalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order total price must be set before starting checkout.");
        }

        ObjectNode payload = buildCheckoutPayload(order, request, totalPrice);
        JsonNode response = payMongoApiClient.createCheckoutSession(payload);

        String checkoutId = text(response.path("data").path("id"));
        String checkoutUrl = text(response.path("data").path("attributes").path("checkout_url"));
        if (checkoutId.isBlank() || checkoutUrl.isBlank()) {
            throw new IllegalArgumentException("PayMongo did not return a valid checkout session.");
        }

        order.setPaymentProvider(PAYMENT_PROVIDER);
        order.setPaymentStatus(PAYMENT_STATUS_PENDING);
        order.setPaymentCheckoutId(checkoutId);
        order.setPaymentCheckoutUrl(checkoutUrl);
        order.setPaymentLastEvent("checkout.created");
        customerOrderRepository.save(order);

        return new PayMongoCheckoutResponse(order.getId(), checkoutId, checkoutUrl, order.getPaymentStatus());
    }

    @Transactional
    public void processWebhook(String payload, String webhookToken, String signatureHeader) {
        ensureEnabled();
        validateWebhookAuth(payload, webhookToken, signatureHeader);

        JsonNode body;
        try {
            body = objectMapper.readTree(payload == null ? "{}" : payload);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid webhook payload.");
        }

        JsonNode eventAttributes = body.path("data").path("attributes");
        String eventType = text(eventAttributes.path("type"));
        JsonNode resource = eventAttributes.path("data");
        JsonNode resourceAttributes = resource.path("attributes");

        String checkoutId = text(resource.path("id"));
        Long orderId = extractOrderId(resourceAttributes.path("metadata").path("orderId"));
        if (orderId == null) {
            String reference = text(resourceAttributes.path("reference_number"));
            orderId = parseOrderIdFromReference(reference);
        }
        if (orderId == null && !checkoutId.isBlank()) {
            orderId = customerOrderRepository.findByPaymentCheckoutId(checkoutId)
                    .map(CustomerOrder::getId)
                    .orElse(null);
        }
        if (orderId == null) {
            throw new IllegalArgumentException("Webhook payload is missing order reference.");
        }

        long resolvedOrderId = orderId;
        CustomerOrder order = customerOrderRepository.findByIdWithItems(resolvedOrderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + resolvedOrderId));

        if (!checkoutId.isBlank()) {
            order.setPaymentCheckoutId(checkoutId);
        }
        String checkoutUrl = text(resourceAttributes.path("checkout_url"));
        if (!checkoutUrl.isBlank()) {
            order.setPaymentCheckoutUrl(checkoutUrl);
        }

        order.setPaymentProvider(PAYMENT_PROVIDER);
        order.setPaymentReference(resolvePaymentReference(resource, resourceAttributes));
        order.setPaymentLastEvent(eventType);

        if (isPaidEvent(eventType)) {
            order.setPaymentStatus(PAYMENT_STATUS_PAID);
            order.setPaymentPaidAt(Instant.now());
            order.setStatus(OrderStatus.PAID);
            order.setMop(PAYMENT_PROVIDER);
        } else if (isFailedEvent(eventType)) {
            order.setPaymentStatus(PAYMENT_STATUS_FAILED);
        } else if (isExpiredEvent(eventType)) {
            order.setPaymentStatus(PAYMENT_STATUS_EXPIRED);
        }

        customerOrderRepository.save(order);
    }

    private ObjectNode buildCheckoutPayload(CustomerOrder order, PayMongoCheckoutRequest request, BigDecimal totalPrice) {
        int amount = toCentavos(totalPrice);
        String successUrl = text(request.successUrl()).isBlank() ? text(properties.checkoutSuccessUrl()) : request.successUrl().trim();
        String cancelUrl = text(request.cancelUrl()).isBlank() ? text(properties.checkoutCancelUrl()) : request.cancelUrl().trim();
        if (successUrl.isBlank() || cancelUrl.isBlank()) {
            throw new IllegalArgumentException("Checkout success/cancel URLs are required.");
        }

        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode data = root.putObject("data");
        ObjectNode attributes = data.putObject("attributes");

        ArrayNode lineItems = attributes.putArray("line_items");
        ObjectNode lineItem = lineItems.addObject();
        lineItem.put("currency", "PHP");
        lineItem.put("amount", amount);
        lineItem.put("name", "Reservation #" + order.getId());
        lineItem.put("quantity", 1);

        ArrayNode paymentMethods = attributes.putArray("payment_method_types");
        properties.resolvedPaymentMethodTypes().forEach(paymentMethods::add);

        attributes.put("success_url", successUrl);
        attributes.put("cancel_url", cancelUrl);
        attributes.put("reference_number", "ORDER-" + order.getId());
        attributes.put("description", "Sole Reax reservation payment");

        ObjectNode metadata = attributes.putObject("metadata");
        metadata.put("orderId", String.valueOf(order.getId()));
        metadata.put("customerName", safe(order.getCustomerName()));

        return root;
    }

    private int toCentavos(BigDecimal amount) {
        try {
            return amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValueExact();
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Order amount is too large for checkout processing.");
        }
    }

    private String resolvePaymentReference(JsonNode resource, JsonNode resourceAttributes) {
        String paymentId = text(resourceAttributes.path("payments").path(0).path("id"));
        if (!paymentId.isBlank()) {
            return paymentId;
        }
        String resourceId = text(resource.path("id"));
        if (!resourceId.isBlank()) {
            return resourceId;
        }
        return text(resourceAttributes.path("reference_number"));
    }

    private Long extractOrderId(JsonNode node) {
        String value = text(node);
        if (value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long parseOrderIdFromReference(String reference) {
        String value = text(reference).toUpperCase();
        if (value.startsWith("ORDER-")) {
            String suffix = value.substring("ORDER-".length());
            try {
                return Long.parseLong(suffix);
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private boolean isPaidEvent(String eventType) {
        String normalized = text(eventType).toLowerCase();
        return normalized.endsWith(".paid") || normalized.contains("payment.paid");
    }

    private boolean isFailedEvent(String eventType) {
        String normalized = text(eventType).toLowerCase();
        return normalized.endsWith(".failed") || normalized.contains("payment.failed");
    }

    private boolean isExpiredEvent(String eventType) {
        return text(eventType).toLowerCase().contains("expired");
    }

    private void ensureEnabled() {
        if (!properties.enabled()) {
            throw new IllegalArgumentException("PayMongo checkout is not enabled.");
        }
    }

    private void ensureSecretKeyConfigured() {
        if (text(properties.secretKey()).isBlank()) {
            throw new IllegalArgumentException("PayMongo secret key is not configured.");
        }
    }

    private void validateWebhookToken(String webhookToken) {
        String configuredToken = text(properties.webhookToken());
        if (!configuredToken.isBlank() && !configuredToken.equals(text(webhookToken))) {
            throw new IllegalArgumentException("Invalid PayMongo webhook token.");
        }
    }

    private void validateWebhookAuth(String payload, String webhookToken, String signatureHeader) {
        String signingSecret = text(properties.webhookSigningSecret());
        if (!signingSecret.isBlank()) {
            validateWebhookSignature(payload, signatureHeader, signingSecret);
            return;
        }
        validateWebhookToken(webhookToken);
    }

    private void validateWebhookSignature(String payload, String signatureHeader, String signingSecret) {
        SignatureParts parts = parseSignatureHeader(signatureHeader);
        if (parts == null || parts.timestamp <= 0 || parts.signature.isBlank()) {
            throw new IllegalArgumentException("Invalid PayMongo webhook signature header.");
        }

        long now = Instant.now().getEpochSecond();
        long driftSeconds = Math.abs(now - parts.timestamp);
        if (driftSeconds > properties.resolvedWebhookToleranceSeconds()) {
            throw new IllegalArgumentException("PayMongo webhook signature expired.");
        }

        String body = payload == null ? "" : payload;
        String expectedWithTimestamp = hmacSha256Hex(signingSecret, parts.timestamp + "." + body);
        String expectedBodyOnly = hmacSha256Hex(signingSecret, body);
        if (!constantTimeEquals(parts.signature, expectedWithTimestamp)
                && !constantTimeEquals(parts.signature, expectedBodyOnly)) {
            throw new IllegalArgumentException("Invalid PayMongo webhook signature.");
        }
    }

    private SignatureParts parseSignatureHeader(String header) {
        String raw = text(header);
        if (raw.isBlank()) {
            return null;
        }
        String timestampValue = "";
        String signatureValue = "";

        for (String part : raw.split(",")) {
            String candidate = part == null ? "" : part.trim();
            if (candidate.isBlank()) {
                continue;
            }
            int separatorIndex = candidate.indexOf('=');
            if (separatorIndex <= 0 || separatorIndex >= candidate.length() - 1) {
                continue;
            }
            String key = candidate.substring(0, separatorIndex).trim().toLowerCase();
            String value = candidate.substring(separatorIndex + 1).trim();
            if ("t".equals(key) || "timestamp".equals(key)) {
                timestampValue = value;
            }
            if ("v1".equals(key) || "signature".equals(key) || "sha256".equals(key)) {
                signatureValue = value;
            }
        }

        if (timestampValue.isBlank() || signatureValue.isBlank()) {
            return null;
        }

        long timestamp;
        try {
            timestamp = Long.parseLong(timestampValue);
        } catch (NumberFormatException ex) {
            return null;
        }

        return new SignatureParts(timestamp, normalizeSignatureValue(signatureValue));
    }

    private String normalizeSignatureValue(String raw) {
        String value = text(raw);
        if (value.startsWith("sha256=")) {
            return value.substring("sha256=".length()).trim().toLowerCase();
        }
        return value.toLowerCase();
    }

    private String hmacSha256Hex(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to validate webhook signature.");
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        String normalizedLeft = text(left);
        String normalizedRight = text(right);
        if (normalizedLeft.length() != normalizedRight.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < normalizedLeft.length(); i++) {
            result |= normalizedLeft.charAt(i) ^ normalizedRight.charAt(i);
        }
        return result == 0;
    }

    private record SignatureParts(long timestamp, String signature) {
    }

    private String text(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        return node.asText("").trim();
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}



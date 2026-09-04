package com.solereax.inventory.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solereax.inventory.order.CustomerOrder;
import com.solereax.inventory.order.CustomerOrderRepository;
import com.solereax.inventory.order.OrderStatus;
import com.solereax.inventory.payment.dto.PayMongoCheckoutRequest;
import com.solereax.inventory.payment.dto.PayMongoCheckoutResponse;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class PayMongoPaymentServiceTest {

    @Test
    void createCheckoutSession_setsPendingStatusAndReturnsCheckoutUrl() throws Exception {
        CustomerOrderRepository orderRepository = mock(CustomerOrderRepository.class);
        PayMongoApiClient apiClient = mock(PayMongoApiClient.class);
        PayMongoProperties properties = new PayMongoProperties(
                true,
                "https://api.paymongo.com/v1",
                "sk_test_123",
                "webhook-token",
                "",
                300,
                "https://solereax.com/success",
                "https://solereax.com/cancel",
                List.of("gcash", "paymaya", "card")
        );
        ObjectMapper objectMapper = new ObjectMapper();
        PayMongoPaymentService service = new PayMongoPaymentService(orderRepository, apiClient, properties);

        CustomerOrder order = new CustomerOrder();
        order.setId(91L);
        order.setCustomerName("Domingo");
        order.setStatus(OrderStatus.ORDERED);
        order.setTotalPrice(new BigDecimal("5999.00"));

        when(orderRepository.findByIdWithItems(91L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(CustomerOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(apiClient.createCheckoutSession(any())).thenReturn(objectMapper.readTree("""
                {
                  "data": {
                    "id": "cs_test_abc",
                    "attributes": {
                      "checkout_url": "https://checkout.paymongo.com/test/abc"
                    }
                  }
                }
                """));

        PayMongoCheckoutResponse response = service.createCheckoutSession(new PayMongoCheckoutRequest(91L, null, null));

        assertThat(response.orderId()).isEqualTo(91L);
        assertThat(response.checkoutId()).isEqualTo("cs_test_abc");
        assertThat(response.checkoutUrl()).isEqualTo("https://checkout.paymongo.com/test/abc");
        assertThat(order.getPaymentStatus()).isEqualTo("PENDING");
        assertThat(order.getPaymentProvider()).isEqualTo("PAYMONGO");
        verify(orderRepository).save(order);
    }

    @Test
    void processWebhook_paidEvent_marksOrderAsPaid() {
        CustomerOrderRepository orderRepository = mock(CustomerOrderRepository.class);
        PayMongoApiClient apiClient = mock(PayMongoApiClient.class);
        PayMongoProperties properties = new PayMongoProperties(
                true,
                "https://api.paymongo.com/v1",
                "sk_test_123",
                "secure-token",
                "",
                300,
                "https://solereax.com/success",
                "https://solereax.com/cancel",
                List.of("gcash", "paymaya")
        );
        PayMongoPaymentService service = new PayMongoPaymentService(orderRepository, apiClient, properties);

        CustomerOrder order = new CustomerOrder();
        order.setId(52L);
        order.setStatus(OrderStatus.ORDERED);
        when(orderRepository.findByIdWithItems(52L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(CustomerOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String payload = """
                {
                  "data": {
                    "attributes": {
                      "type": "checkout_session.payment.paid",
                      "data": {
                        "id": "cs_test_52",
                        "attributes": {
                          "reference_number": "ORDER-52",
                          "metadata": {
                            "orderId": "52"
                          },
                          "payments": [
                            { "id": "pay_123" }
                          ]
                        }
                      }
                    }
                  }
                }
                """;

        service.processWebhook(payload, "secure-token", null);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaymentStatus()).isEqualTo("PAID");
        assertThat(order.getMop()).isEqualTo("PAYMONGO");
        assertThat(order.getPaymentReference()).isEqualTo("pay_123");
        verify(orderRepository).save(order);
    }

    @Test
    void processWebhook_rejectsInvalidToken() {
        CustomerOrderRepository orderRepository = mock(CustomerOrderRepository.class);
        PayMongoApiClient apiClient = mock(PayMongoApiClient.class);
        PayMongoProperties properties = new PayMongoProperties(
                true,
                "https://api.paymongo.com/v1",
                "sk_test_123",
                "expected-token",
                "",
                300,
                "https://solereax.com/success",
                "https://solereax.com/cancel",
                List.of("gcash")
        );
        PayMongoPaymentService service = new PayMongoPaymentService(orderRepository, apiClient, properties);

        assertThatThrownBy(() -> service.processWebhook("{}", "wrong-token", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid PayMongo webhook token");

        verify(orderRepository, never()).save(any());
    }

    @Test
    void processWebhook_acceptsValidSignatureWhenSigningSecretConfigured() {
        CustomerOrderRepository orderRepository = mock(CustomerOrderRepository.class);
        PayMongoApiClient apiClient = mock(PayMongoApiClient.class);
        String signingSecret = "whsec_test_secret";
        PayMongoProperties properties = new PayMongoProperties(
                true,
                "https://api.paymongo.com/v1",
                "sk_test_123",
                "",
                signingSecret,
                300,
                "https://solereax.com/success",
                "https://solereax.com/cancel",
                List.of("gcash")
        );
        PayMongoPaymentService service = new PayMongoPaymentService(orderRepository, apiClient, properties);

        CustomerOrder order = new CustomerOrder();
        order.setId(88L);
        order.setStatus(OrderStatus.ORDERED);
        when(orderRepository.findByIdWithItems(88L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(CustomerOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String payload = """
                {
                  "data": {
                    "attributes": {
                      "type": "checkout_session.payment.paid",
                      "data": {
                        "id": "cs_test_88",
                        "attributes": {
                          "reference_number": "ORDER-88",
                          "metadata": {
                            "orderId": "88"
                          }
                        }
                      }
                    }
                  }
                }
                """;
        long timestamp = Instant.now().getEpochSecond();
        String signature = hmacSha256Hex(signingSecret, timestamp + "." + payload);
        String signatureHeader = "t=" + timestamp + ",v1=" + signature;

        service.processWebhook(payload, null, signatureHeader);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaymentStatus()).isEqualTo("PAID");
        verify(orderRepository).save(order);
    }

    @Test
    void processWebhook_rejectsInvalidSignatureWhenSigningSecretConfigured() {
        CustomerOrderRepository orderRepository = mock(CustomerOrderRepository.class);
        PayMongoApiClient apiClient = mock(PayMongoApiClient.class);
        PayMongoProperties properties = new PayMongoProperties(
                true,
                "https://api.paymongo.com/v1",
                "sk_test_123",
                "",
                "whsec_test_secret",
                300,
                "https://solereax.com/success",
                "https://solereax.com/cancel",
                List.of("gcash")
        );
        PayMongoPaymentService service = new PayMongoPaymentService(orderRepository, apiClient, properties);

        long now = Instant.now().getEpochSecond();
        assertThatThrownBy(() -> service.processWebhook("{}", null, "t=" + now + ",v1=deadbeef"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid PayMongo webhook signature");

        verify(orderRepository, never()).save(any());
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
            throw new IllegalStateException(ex);
        }
    }
}


package com.solereax.inventory.order;

import com.solereax.inventory.order.dto.OrderResponse;
import com.solereax.inventory.order.dto.ReserveOrderRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/orders")
public class PublicOrderController {
    private final OrderService orderService;

    public PublicOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/reserve")
    public OrderResponse reserveOrder(@Valid @RequestBody ReserveOrderRequest request) {
        return orderService.reserveOrder(request);
    }
}

package com.solereax.inventory.giveaway;

import com.solereax.inventory.settings.AdminProofRevokeRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings/gaming/giveaway-wheel")
public class AdminGiveawayWheelController {
    private final GiveawayWheelService giveawayWheelService;

    public AdminGiveawayWheelController(GiveawayWheelService giveawayWheelService) {
        this.giveawayWheelService = giveawayWheelService;
    }

    @GetMapping("/entries")
    public ResponseEntity<List<GiveawayWheelEntryResponse>> listEntries() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(giveawayWheelService.listAdminEntries());
    }

    @PatchMapping("/entries/{entryId}/approve")
    public ResponseEntity<GiveawayWheelEntryResponse> approveEntry(@PathVariable Long entryId) {
        return ResponseEntity.ok(giveawayWheelService.approveEntry(entryId));
    }

    @PatchMapping("/entries/{entryId}/proofs/{proofType}/validate")
    public ResponseEntity<GiveawayWheelEntryResponse> validateProof(
            @PathVariable Long entryId,
            @PathVariable String proofType
    ) {
        return ResponseEntity.ok(giveawayWheelService.validateProof(entryId, proofType));
    }

    @PatchMapping("/entries/{entryId}/reject")
    public ResponseEntity<GiveawayWheelEntryResponse> rejectEntry(
            @PathVariable Long entryId,
            @Valid @RequestBody AdminProofRevokeRequest request
    ) {
        return ResponseEntity.ok(giveawayWheelService.rejectEntry(entryId, request.message()));
    }

    @PatchMapping("/entries/{entryId}/proofs/{proofType}/revoke")
    public ResponseEntity<GiveawayWheelEntryResponse> revokeProof(
            @PathVariable Long entryId,
            @PathVariable String proofType,
            @Valid @RequestBody AdminProofRevokeRequest request
    ) {
        return ResponseEntity.ok(giveawayWheelService.revokeProof(entryId, proofType, request.message()));
    }
}


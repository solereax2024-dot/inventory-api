package com.solereax.inventory.tetris;

import java.io.IOException;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/giveaway/bonus")
public class GiveawayBonusController {
    private final GiveawayBonusService giveawayBonusService;

    public GiveawayBonusController(GiveawayBonusService giveawayBonusService) {
        this.giveawayBonusService = giveawayBonusService;
    }

    @GetMapping("/me")
    public ResponseEntity<GiveawayBonusStatusResponse> getMyBonusStatus(Principal principal) {
        return ResponseEntity.ok(giveawayBonusService.getBonusStatus(principal.getName()));
    }

    @PostMapping("/me/follow-proof")
    public ResponseEntity<GiveawayBonusUploadResponse> uploadFollowProof(
            Principal principal,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return ResponseEntity.ok(giveawayBonusService.uploadFollowProof(principal.getName(), file));
    }

    @PostMapping("/me/review-proof")
    public ResponseEntity<GiveawayBonusUploadResponse> uploadReviewProof(
            Principal principal,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return ResponseEntity.ok(giveawayBonusService.uploadReviewProof(principal.getName(), file));
    }
}


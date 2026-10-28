package com.solereax.inventory.giveaway;

import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/public/giveaway-wheel")
public class PublicGiveawayWheelController {
    private final GiveawayWheelService giveawayWheelService;

    public PublicGiveawayWheelController(GiveawayWheelService giveawayWheelService) {
        this.giveawayWheelService = giveawayWheelService;
    }

    @GetMapping("/entries/wheel")
    public ResponseEntity<List<GiveawayWheelEntrySummaryResponse>> listWheelEntries() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(giveawayWheelService.listWheelEntries());
    }

    @GetMapping("/entries/search")
    public ResponseEntity<List<GiveawayWheelEntrySummaryResponse>> searchEntries(@RequestParam(name = "q", defaultValue = "") String query) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(giveawayWheelService.searchEntries(query));
    }

    @GetMapping("/entries/{entryId}")
    public ResponseEntity<GiveawayWheelEntryResponse> getEntry(@PathVariable Long entryId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(giveawayWheelService.getEntry(entryId));
    }

    @PostMapping(value = "/entries", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GiveawayWheelEntryResponse> createEntry(
            @RequestParam String fullName,
            @RequestParam(name = "followProof", required = false) MultipartFile followProof,
            @RequestParam(name = "commentProof", required = false) MultipartFile commentProof,
            @RequestParam(name = "shareProof", required = false) MultipartFile shareProof,
            @RequestParam(name = "reviewProof", required = false) MultipartFile reviewProof,
            @RequestParam(name = "facebookProfile", required = false) MultipartFile facebookProfile
    ) {
        return ResponseEntity.ok(giveawayWheelService.createEntry(fullName, followProof, commentProof, shareProof, reviewProof, facebookProfile));
    }

    @PutMapping(value = "/entries/{entryId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GiveawayWheelEntryResponse> updateEntry(
            @PathVariable Long entryId,
            @RequestParam String fullName,
            @RequestParam(name = "followProof", required = false) MultipartFile followProof,
            @RequestParam(name = "commentProof", required = false) MultipartFile commentProof,
            @RequestParam(name = "shareProof", required = false) MultipartFile shareProof,
            @RequestParam(name = "reviewProof", required = false) MultipartFile reviewProof,
            @RequestParam(name = "facebookProfile", required = false) MultipartFile facebookProfile
    ) {
        return ResponseEntity.ok(giveawayWheelService.updateEntry(entryId, fullName, followProof, commentProof, shareProof, reviewProof, facebookProfile));
    }
}


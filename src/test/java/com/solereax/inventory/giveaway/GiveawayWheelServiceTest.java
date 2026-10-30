package com.solereax.inventory.giveaway;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.solereax.inventory.settings.MediaStorageService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GiveawayWheelServiceTest {

    @Mock
    private GiveawayWheelEntryRepository giveawayWheelEntryRepository;

    @Mock
    private MediaStorageService mediaStorageService;

    private GiveawayWheelService giveawayWheelService;
    private List<GiveawayWheelEntry> storedEntries;
    private AtomicLong nextId;

    @BeforeEach
    void setUp() {
        giveawayWheelService = new GiveawayWheelService(giveawayWheelEntryRepository, mediaStorageService);
        storedEntries = new ArrayList<>();
        nextId = new AtomicLong(1L);

        when(mediaStorageService.storeImage(any(MultipartFile.class), eq("giveaway-wheel"))).thenAnswer(invocation -> {
            MultipartFile file = invocation.getArgument(0, MultipartFile.class);
            return "/uploads/giveaway-wheel/" + file.getOriginalFilename();
        });
        when(giveawayWheelEntryRepository.save(any(GiveawayWheelEntry.class))).thenAnswer(invocation -> {
            GiveawayWheelEntry entry = invocation.getArgument(0, GiveawayWheelEntry.class);
            if (entry.getId() == null) {
                entry.setId(nextId.getAndIncrement());
            }
            storedEntries.removeIf(existing -> existing.getId().equals(entry.getId()));
            storedEntries.add(entry);
            return entry;
        });
        when(giveawayWheelEntryRepository.findById(anyLong())).thenAnswer(invocation -> {
            Long entryId = invocation.getArgument(0, Long.class);
            return storedEntries.stream()
                    .filter(entry -> entry.getId().equals(entryId))
                    .findFirst();
        });
        when(giveawayWheelEntryRepository.findAllByEntryCountGreaterThanOrderByUpdatedAtDesc(anyInt())).thenAnswer(invocation -> {
            Integer minimumCount = invocation.getArgument(0, Integer.class);
            return storedEntries.stream()
                    .filter(entry -> entry.getEntryCount() > minimumCount)
                    .sorted(Comparator.comparing(GiveawayWheelEntry::getUpdatedAt).reversed())
                    .toList();
        });
        when(giveawayWheelEntryRepository.findAllByOrderByUpdatedAtDesc()).thenAnswer(invocation -> storedEntries.stream()
                .sorted(Comparator.comparing(GiveawayWheelEntry::getUpdatedAt).reversed())
                .toList());
        when(giveawayWheelEntryRepository.findTop20ByFullNameContainingIgnoreCaseOrderByUpdatedAtDesc(anyString())).thenAnswer(invocation -> {
            String query = invocation.getArgument(0, String.class).toLowerCase(Locale.ROOT);
            return storedEntries.stream()
                    .filter(entry -> entry.getFullName().toLowerCase(Locale.ROOT).contains(query))
                    .sorted(Comparator.comparing(GiveawayWheelEntry::getUpdatedAt).reversed())
                    .limit(20)
                    .toList();
        });
        when(giveawayWheelEntryRepository.existsByFullNameIgnoreCase(anyString())).thenAnswer(invocation -> {
            String fullName = invocation.getArgument(0, String.class);
            return storedEntries.stream().anyMatch(entry -> entry.getFullName().equalsIgnoreCase(fullName));
        });
        when(giveawayWheelEntryRepository.existsByFullNameIgnoreCaseAndIdNot(anyString(), anyLong())).thenAnswer(invocation -> {
            String fullName = invocation.getArgument(0, String.class);
            Long excludedId = invocation.getArgument(1, Long.class);
            return storedEntries.stream()
                    .anyMatch(entry -> !entry.getId().equals(excludedId) && entry.getFullName().equalsIgnoreCase(fullName));
        });
    }

    @Test
    void createEntry_keepsUploadedProofsPendingUntilTheyAreValidated() {
        GiveawayWheelEntryResponse response = giveawayWheelService.createEntry(
                "Juan Dela Cruz",
                image("follow-proof.png"),
                null,
                image("share-proof.png"),
                null,
                image("facebook-profile.png")
        );

        assertEquals(0, response.entryCount());
        assertEquals(4, response.submittedEntryCount());
        assertEquals(GiveawayWheelEntryStatus.PENDING, response.status());
        assertEquals(GiveawayWheelProofStatus.PENDING, response.followProof().status());
        assertEquals(GiveawayWheelProofStatus.PENDING, response.shareProof().status());
        assertEquals(GiveawayWheelProofStatus.PENDING, response.facebookProfile().status());
        assertEquals(GiveawayWheelProofStatus.NOT_UPLOADED, response.commentProof().status());
        assertEquals(GiveawayWheelProofStatus.NOT_UPLOADED, response.reviewProof().status());
    }

    @Test
    void validateProof_onlyActivatesTheSelectedProofButAlreadyShowsLiveWheelSlots() {
        GiveawayWheelEntryResponse created = giveawayWheelService.createEntry(
                "Maria Santos",
                image("follow-proof.png"),
                image("comment-proof.png"),
                null,
                null,
                image("facebook-profile.png")
        );

        GiveawayWheelEntryResponse validated = giveawayWheelService.validateProof(created.id(), "follow");
        List<GiveawayWheelEntrySummaryResponse> wheelEntries = giveawayWheelService.listWheelEntries();

        assertEquals(1, validated.entryCount());
        assertEquals(3, validated.submittedEntryCount());
        assertEquals(GiveawayWheelEntryStatus.PENDING, validated.status());
        assertEquals(GiveawayWheelProofStatus.APPROVED, validated.followProof().status());
        assertEquals(GiveawayWheelProofStatus.PENDING, validated.commentProof().status());
        assertEquals(1, wheelEntries.size());
        assertEquals(created.id(), wheelEntries.get(0).id());
        assertEquals(1, wheelEntries.get(0).entryCount());
    }

    @Test
    void revokeProof_onlyRemovesThatProofsSlotsAndKeepsOtherApprovedProofsActive() {
        GiveawayWheelEntryResponse created = giveawayWheelService.createEntry(
                "Liza Mercado",
                image("follow-proof.png"),
                image("comment-proof.png"),
                null,
                null,
                image("facebook-profile.png")
        );
        giveawayWheelService.approveEntry(created.id());

        GiveawayWheelEntryResponse revoked = giveawayWheelService.revokeProof(
                created.id(),
                "comment",
                "Tagged-friend screenshot is blurred. Please upload a clearer proof."
        );

        assertEquals(1, revoked.entryCount());
        assertEquals(3, revoked.submittedEntryCount());
        assertEquals(GiveawayWheelEntryStatus.REJECTED, revoked.status());
        assertEquals(GiveawayWheelProofStatus.APPROVED, revoked.followProof().status());
        assertEquals(GiveawayWheelProofStatus.REJECTED, revoked.commentProof().status());
        assertTrue(Optional.ofNullable(revoked.rejectionReason()).orElse("").contains("Tag Friend"));
        assertTrue(Optional.ofNullable(revoked.rejectionReason()).orElse("").contains("blurred"));
    }

    @Test
    void approveEntry_stillValidatesAllUploadedProofsForBackwardCompatibility() {
        GiveawayWheelEntryResponse created = giveawayWheelService.createEntry(
                "Paolo Reyes",
                image("follow-proof.png"),
                null,
                null,
                image("review-proof.png"),
                image("facebook-profile.png")
        );

        GiveawayWheelEntryResponse approved = giveawayWheelService.approveEntry(created.id());

        assertEquals(6, approved.entryCount());
        assertEquals(6, approved.submittedEntryCount());
        assertEquals(GiveawayWheelEntryStatus.APPROVED, approved.status());
        assertEquals(GiveawayWheelProofStatus.APPROVED, approved.followProof().status());
        assertEquals(GiveawayWheelProofStatus.APPROVED, approved.reviewProof().status());
        assertEquals(GiveawayWheelProofStatus.APPROVED, approved.facebookProfile().status());
        assertEquals(GiveawayWheelProofStatus.NOT_UPLOADED, approved.commentProof().status());
        assertEquals(GiveawayWheelProofStatus.NOT_UPLOADED, approved.shareProof().status());
    }

    @Test
    void updateEntry_replacingOneProofResetsOnlyThatProofToPending() {
        GiveawayWheelEntryResponse created = giveawayWheelService.createEntry(
                "Nina Lopez",
                image("follow-proof.png"),
                image("comment-proof.png"),
                null,
                null,
                image("facebook-profile.png")
        );
        giveawayWheelService.approveEntry(created.id());

        GiveawayWheelEntryResponse updated = giveawayWheelService.updateEntry(
                created.id(),
                "Nina Lopez",
                null,
                image("comment-proof-v2.png"),
                null,
                null,
                null
        );

        assertEquals(1, updated.entryCount());
        assertEquals(3, updated.submittedEntryCount());
        assertEquals(GiveawayWheelEntryStatus.PENDING, updated.status());
        assertEquals(GiveawayWheelProofStatus.APPROVED, updated.followProof().status());
        assertEquals(GiveawayWheelProofStatus.PENDING, updated.commentProof().status());
        assertEquals("/uploads/giveaway-wheel/comment-proof-v2.png", updated.commentProof().imagePath());
    }

    @Test
    void createEntry_throwsWhenFullNameAlreadyExists() {
        giveawayWheelService.createEntry(
                "Unique Name",
                image("follow-proof.png"),
                null,
                null,
                null,
                image("facebook-profile.png")
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> giveawayWheelService.createEntry(
                        "unique name",
                        image("follow-proof-2.png"),
                        null,
                        null,
                        null,
                        image("facebook-profile-2.png")
                )
        );

        assertEquals("This full name is already registered in Giveaway 2.", exception.getMessage());
    }

    @Test
    void updateEntry_throwsWhenRenamingToAnotherExistingFullName() {
        GiveawayWheelEntryResponse first = giveawayWheelService.createEntry(
                "Name One",
                image("follow-proof-1.png"),
                null,
                null,
                null,
                image("facebook-profile-1.png")
        );
        GiveawayWheelEntryResponse second = giveawayWheelService.createEntry(
                "Name Two",
                image("follow-proof-2.png"),
                null,
                null,
                null,
                image("facebook-profile-2.png")
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> giveawayWheelService.updateEntry(
                        second.id(),
                        "name one",
                        null,
                        null,
                        null,
                        null,
                        null
                )
        );

        assertEquals("This full name is already registered in Giveaway 2.", exception.getMessage());
        assertEquals("Name One", giveawayWheelService.getEntry(first.id()).fullName());
        assertEquals("Name Two", giveawayWheelService.getEntry(second.id()).fullName());
    }

    private MockMultipartFile image(String filename) {
        return new MockMultipartFile("file", filename, "image/png", ("img-" + filename).getBytes());
    }
}



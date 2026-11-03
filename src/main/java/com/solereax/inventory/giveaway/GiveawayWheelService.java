package com.solereax.inventory.giveaway;

import com.solereax.inventory.settings.MediaStorageService;
import com.solereax.inventory.shared.NotFoundException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class GiveawayWheelService {
    public static final int FOLLOW_ENTRY_COUNT = 1;
    public static final int COMMENT_ENTRY_COUNT = 2;
    public static final int SHARE_ENTRY_COUNT = 3;
    public static final int REVIEW_ENTRY_COUNT = 5;
    private static final String UPLOAD_FOLDER = "giveaway-wheel";
    private static final String GIVEAWAY_1_SOURCE_TAG = "GIVEAWAY_1";

    private final GiveawayWheelEntryRepository giveawayWheelEntryRepository;
    private final GiveawayWheelDrawRepository giveawayWheelDrawRepository;
    private final MediaStorageService mediaStorageService;
    private final PasswordEncoder passwordEncoder;

    public GiveawayWheelService(
            GiveawayWheelEntryRepository giveawayWheelEntryRepository,
            GiveawayWheelDrawRepository giveawayWheelDrawRepository,
            MediaStorageService mediaStorageService,
            PasswordEncoder passwordEncoder
    ) {
        this.giveawayWheelEntryRepository = giveawayWheelEntryRepository;
        this.giveawayWheelDrawRepository = giveawayWheelDrawRepository;
        this.mediaStorageService = mediaStorageService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public GiveawayWheelDrawResponse drawWinner(boolean removeWinnerFromWheel) {
        List<GiveawayWheelEntry> approvedEntries = giveawayWheelEntryRepository
                .findAllByEntryCountGreaterThanAndExcludedFromWheelFalseOrderByWheelDisplayOrderAscUpdatedAtDesc(0)
                .stream()
                .filter(entry -> entry.getEntryCount() > 0)
                .toList();

        int totalTickets = approvedEntries.stream()
                .mapToInt(GiveawayWheelEntry::getEntryCount)
                .sum();
        String drawSnapshotHash = buildDrawSnapshotHash(approvedEntries);
        if (totalTickets <= 0) {
            throw new IllegalArgumentException("No approved entries available for draw yet.");
        }

        int winningTicketIndex = ThreadLocalRandom.current().nextInt(totalTickets);
        int runningTicketCount = 0;
        GiveawayWheelEntry winningEntry = null;
        int winnerTicketOffset = 0;

        for (GiveawayWheelEntry entry : approvedEntries) {
            int entryTickets = Math.max(0, entry.getEntryCount());
            if (winningTicketIndex < runningTicketCount + entryTickets) {
                winningEntry = entry;
                winnerTicketOffset = winningTicketIndex - runningTicketCount;
                break;
            }
            runningTicketCount += entryTickets;
        }

        if (winningEntry == null) {
            throw new IllegalStateException("Unable to determine a giveaway winner.");
        }

        GiveawayWheelDraw draw = new GiveawayWheelDraw();
        draw.setWinnerEntryId(winningEntry.getId());
        draw.setWinnerFullName(winningEntry.getFullName());
        draw.setWinnerEntryCount(Math.max(0, winningEntry.getEntryCount()));
        draw.setTotalTickets(totalTickets);
        draw.setWinningTicketIndex(winningTicketIndex);
        draw.setWinnerTicketOffset(winnerTicketOffset);
        draw.setEligibleEntryCount(approvedEntries.size());
        draw.setDrawSnapshotHash(drawSnapshotHash);
        draw.setCreatedAt(Instant.now());

        Instant now = Instant.now();
        winningEntry.setWinner(true);
        winningEntry.setWonAt(now);
        winningEntry.setWinMode(removeWinnerFromWheel ? "remove" : "keep");

        if (removeWinnerFromWheel) {
            List<GiveawayWheelEntry> matchingEntries = giveawayWheelEntryRepository.findAllByFullNameIgnoreCase(winningEntry.getFullName());
            for (GiveawayWheelEntry entry : matchingEntries) {
                entry.setExcludedFromWheel(true);
                entry.setUpdatedAt(now);
                if (entry.getId().equals(winningEntry.getId())) {
                    entry.setWinner(true);
                    entry.setWonAt(now);
                    entry.setWinMode("remove");
                }
            }
            giveawayWheelEntryRepository.saveAll(matchingEntries);
        } else {
            winningEntry.setExcludedFromWheel(false);
            winningEntry.setUpdatedAt(now);
            giveawayWheelEntryRepository.save(winningEntry);
        }

        GiveawayWheelDraw savedDraw = giveawayWheelDrawRepository.save(draw);
        return new GiveawayWheelDrawResponse(
                savedDraw.getId(),
                savedDraw.getWinnerEntryId(),
                savedDraw.getWinnerFullName(),
                winningEntry.getFacebookProfileImagePath(),
                savedDraw.getWinnerEntryCount(),
                removeWinnerFromWheel,
                removeWinnerFromWheel ? "remove" : "keep",
                savedDraw.getEligibleEntryCount(),
                savedDraw.getTotalTickets(),
                savedDraw.getWinningTicketIndex(),
                savedDraw.getWinnerTicketOffset(),
                savedDraw.getDrawSnapshotHash(),
                savedDraw.getCreatedAt()
        );
    }

    private String buildDrawSnapshotHash(List<GiveawayWheelEntry> approvedEntries) {
        String payload = approvedEntries.stream()
                .map(entry -> String.format(
                        "%d|%s|%d|%d",
                        entry.getId(),
                        normalizeText(entry.getFullName()).toLowerCase(),
                        Math.max(0, entry.getEntryCount()),
                        entry.getWheelDisplayOrder()
                ))
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            return toHex(hashBytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Unable to compute draw snapshot hash.", exception);
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(String.format("%02x", value));
        }
        return builder.toString();
    }

    @Transactional
    public GiveawayWheelCleanupResponse clearAllEntries() {
        long deletedUploadFiles = deleteGiveawayUploads();
        long deletedDrawHistory = giveawayWheelDrawRepository.deleteAllByIdIsNotNull();
        long deletedEntries = giveawayWheelEntryRepository.deleteAllByIdIsNotNull();
        return new GiveawayWheelCleanupResponse(deletedEntries, deletedDrawHistory, deletedUploadFiles);
    }

    @Transactional
    public void deleteEntry(Long entryId) {
        GiveawayWheelEntry entry = findEntry(entryId);
        deleteEntryUploads(entry);
        giveawayWheelEntryRepository.delete(entry);
    }

    @Transactional
    public GiveawayWheelResetResponse resetWinnerStatus(Long entryId) {
        GiveawayWheelEntry targetEntry = findEntry(entryId);
        List<GiveawayWheelEntry> matchingEntries = giveawayWheelEntryRepository.findAllByFullNameIgnoreCase(targetEntry.getFullName());
        Instant now = Instant.now();
        long resetCount = 0;

        for (GiveawayWheelEntry entry : matchingEntries) {
            if (entry.isWinner() || entry.isExcludedFromWheel() || entry.getWonAt() != null || hasValue(entry.getWinMode())) {
                resetCount++;
            }
            entry.setWinner(false);
            entry.setExcludedFromWheel(false);
            entry.setWonAt(null);
            entry.setWinMode(null);
            entry.setUpdatedAt(now);
        }

        giveawayWheelEntryRepository.saveAll(matchingEntries);
        return new GiveawayWheelResetResponse(targetEntry.getFullName(), resetCount, matchingEntries.size());
    }

    private long deleteGiveawayUploads() {
        Path folderPath = Paths.get(mediaStorageService.getUploadBaseDirectoryAbsolutePath())
                .resolve(UPLOAD_FOLDER)
                .normalize();

        if (!Files.exists(folderPath)) {
            return 0;
        }

        long deletedFileCount = 0;
        try (Stream<Path> walk = Files.walk(folderPath)) {
            List<Path> paths = walk.sorted(Comparator.reverseOrder()).toList();
            for (Path path : paths) {
                if (!path.equals(folderPath) && Files.isRegularFile(path)) {
                    deletedFileCount++;
                }
                Files.deleteIfExists(path);
            }
            Files.createDirectories(folderPath);
            return deletedFileCount;
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to clear giveaway wheel uploads.", exception);
        }
    }

    private void deleteEntryUploads(GiveawayWheelEntry entry) {
        Set<String> uniquePaths = new HashSet<>();
        uniquePaths.add(entry.getFollowProofImagePath());
        uniquePaths.add(entry.getCommentProofImagePath());
        uniquePaths.add(entry.getShareProofImagePath());
        uniquePaths.add(entry.getReviewProofImagePath());
        uniquePaths.add(entry.getFacebookProfileImagePath());

        for (String uploadPath : uniquePaths) {
            deleteUploadFileIfExists(uploadPath);
        }
    }

    private void deleteUploadFileIfExists(String uploadPath) {
        if (!hasValue(uploadPath)) {
            return;
        }
        String normalizedPath = uploadPath.trim();
        String expectedPrefix = "/uploads/" + UPLOAD_FOLDER + "/";
        if (!normalizedPath.startsWith(expectedPrefix)) {
            return;
        }

        String relativePath = normalizedPath.substring("/uploads/".length());
        Path filePath = Paths.get(mediaStorageService.getUploadBaseDirectoryAbsolutePath())
                .resolve(relativePath)
                .normalize();
        Path uploadsRoot = Paths.get(mediaStorageService.getUploadBaseDirectoryAbsolutePath()).normalize();
        if (!filePath.startsWith(uploadsRoot)) {
            return;
        }

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to delete giveaway wheel upload file.", exception);
        }
    }

    @Transactional
    public GiveawayWheelShuffleResponse shuffleWheel() {
        List<GiveawayWheelEntry> activeWheelEntries = new ArrayList<>(
                giveawayWheelEntryRepository.findAllByEntryCountGreaterThanAndExcludedFromWheelFalseOrderByWheelDisplayOrderAscUpdatedAtDesc(0)
        );
        Collections.shuffle(activeWheelEntries);

        int displayOrder = 1;
        Instant now = Instant.now();
        for (GiveawayWheelEntry entry : activeWheelEntries) {
            entry.setWheelDisplayOrder(displayOrder++);
            entry.setUpdatedAt(now);
        }
        giveawayWheelEntryRepository.saveAll(activeWheelEntries);

        return new GiveawayWheelShuffleResponse(activeWheelEntries.size());
    }

    @Transactional(readOnly = true)
    public List<GiveawayWheelEntrySummaryResponse> listWheelEntries() {
        return giveawayWheelEntryRepository.findAllByEntryCountGreaterThanAndExcludedFromWheelFalseOrderByWheelDisplayOrderAscUpdatedAtDesc(0).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GiveawayWheelEntrySummaryResponse> searchEntries(String query) {
        String normalizedQuery = normalizeText(query);
        if (normalizedQuery.length() < 2) {
            return List.of();
        }
        return giveawayWheelEntryRepository.findTop20ByFullNameContainingIgnoreCaseOrderByUpdatedAtDesc(normalizedQuery).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GiveawayWheelEntryResponse getEntry(Long entryId) {
        return toResponse(findEntry(entryId));
    }

    @Transactional(readOnly = true)
    public GiveawayWheelEntryResponse openEntryFromSearch(Long entryId, String password) {
        GiveawayWheelEntry entry = findEntry(entryId);
        validateEntryAccessPassword(entry, password);
        return toResponse(entry);
    }

    @Transactional(readOnly = true)
    public List<GiveawayWheelEntryResponse> listAdminEntries() {
        return giveawayWheelEntryRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public GiveawayWheelEntryResponse createEntry(
            String fullName,
            String entryPassword,
            MultipartFile followProof,
            MultipartFile commentProof,
            MultipartFile shareProof,
            MultipartFile reviewProof,
            MultipartFile facebookProfile
    ) {
        GiveawayWheelEntry entry = new GiveawayWheelEntry();
        entry.setCreatedAt(Instant.now());
        return saveEntry(entry, fullName, entryPassword, followProof, commentProof, shareProof, reviewProof, facebookProfile, true);
    }

    @Transactional
    public GiveawayWheelEntryResponse updateEntry(
            Long entryId,
            String fullName,
            String entryPassword,
            MultipartFile followProof,
            MultipartFile commentProof,
            MultipartFile shareProof,
            MultipartFile reviewProof,
            MultipartFile facebookProfile
    ) {
        GiveawayWheelEntry entry = findEntry(entryId);
        if (isImportedFromGiveaway1(entry)) {
            throw new IllegalArgumentException("This entry came from Giveaway 1 and cannot be edited here.");
        }
        return saveEntry(entry, fullName, entryPassword, followProof, commentProof, shareProof, reviewProof, facebookProfile, false);
    }

    @Transactional
    public GiveawayWheelEntryResponse approveEntry(Long entryId) {
        GiveawayWheelEntry entry = findEntry(entryId);
        validateAllUploadedProofs(entry);
        entry.setUpdatedAt(Instant.now());
        syncDerivedState(entry);
        return toResponse(giveawayWheelEntryRepository.save(entry));
    }

    @Transactional
    public GiveawayWheelEntryResponse rejectEntry(Long entryId, String message) {
        GiveawayWheelEntry entry = findEntry(entryId);
        revokeAllUploadedProofs(entry, requireMessage(message));
        entry.setUpdatedAt(Instant.now());
        syncDerivedState(entry);
        return toResponse(giveawayWheelEntryRepository.save(entry));
    }

    @Transactional
    public GiveawayWheelEntryResponse validateProof(Long entryId, String proofType) {
        GiveawayWheelEntry entry = findEntry(entryId);
        updateProofState(entry, GiveawayWheelProofType.from(proofType), true, false, null);
        entry.setUpdatedAt(Instant.now());
        syncDerivedState(entry);
        return toResponse(giveawayWheelEntryRepository.save(entry));
    }

    @Transactional
    public GiveawayWheelEntryResponse revokeProof(Long entryId, String proofType, String message) {
        GiveawayWheelEntry entry = findEntry(entryId);
        updateProofState(entry, GiveawayWheelProofType.from(proofType), false, true, requireMessage(message));
        entry.setUpdatedAt(Instant.now());
        syncDerivedState(entry);
        return toResponse(giveawayWheelEntryRepository.save(entry));
    }

    private GiveawayWheelEntryResponse saveEntry(
            GiveawayWheelEntry entry,
            String fullName,
            String entryPassword,
            MultipartFile followProof,
            MultipartFile commentProof,
            MultipartFile shareProof,
            MultipartFile reviewProof,
            MultipartFile facebookProfile,
            boolean creating
    ) {
        String normalizedFullName = requireFullName(fullName);
        ensureUniqueFullName(normalizedFullName, entry.getId(), creating);
        entry.setFullName(normalizedFullName);
        if (creating) {
            requireEntryPassword(entryPassword);
        }
        if (!creating) {
            ensureUpdatePasswordAllowed(entry, entryPassword);
        }
        upsertEntryPassword(entry, entryPassword, creating);
        replaceImageIfProvided(followProof, entry::setFollowProofImagePath, () -> resetProofState(entry, GiveawayWheelProofType.FOLLOW));
        replaceImageIfProvided(commentProof, entry::setCommentProofImagePath, () -> resetProofState(entry, GiveawayWheelProofType.COMMENT));
        replaceImageIfProvided(shareProof, entry::setShareProofImagePath, () -> resetProofState(entry, GiveawayWheelProofType.SHARE));
        replaceImageIfProvided(reviewProof, entry::setReviewProofImagePath, () -> resetProofState(entry, GiveawayWheelProofType.REVIEW));
        replaceImageIfProvided(facebookProfile, entry::setFacebookProfileImagePath, () -> resetProofState(entry, GiveawayWheelProofType.FACEBOOK_PROFILE));

        ensureFacebookProfileExists(entry.getFacebookProfileImagePath(), creating);
        int submittedEntryCount = calculateSubmittedEntryCount(entry);
        if (submittedEntryCount <= 0) {
            throw new IllegalArgumentException("Upload at least one giveaway proof to join the spin wheel.");
        }

        entry.setSubmittedEntryCount(submittedEntryCount);
        entry.setUpdatedAt(Instant.now());
        syncDerivedState(entry);
        return toResponse(giveawayWheelEntryRepository.save(entry));
    }

    private int calculateSubmittedEntryCount(GiveawayWheelEntry entry) {
        int total = 0;
        if (hasValue(entry.getFollowProofImagePath())) {
            total += FOLLOW_ENTRY_COUNT;
        }
        if (hasValue(entry.getCommentProofImagePath())) {
            total += COMMENT_ENTRY_COUNT;
        }
        if (hasValue(entry.getShareProofImagePath())) {
            total += SHARE_ENTRY_COUNT;
        }
        if (hasValue(entry.getReviewProofImagePath())) {
            total += REVIEW_ENTRY_COUNT;
        }
        return total;
    }

    private int calculateApprovedEntryCount(GiveawayWheelEntry entry) {
        int total = 0;
        if (isProofActive(entry.getFollowProofImagePath(), entry.isFollowProofValidated(), entry.isFollowProofRevoked())) {
            total += FOLLOW_ENTRY_COUNT;
        }
        if (isProofActive(entry.getCommentProofImagePath(), entry.isCommentProofValidated(), entry.isCommentProofRevoked())) {
            total += COMMENT_ENTRY_COUNT;
        }
        if (isProofActive(entry.getShareProofImagePath(), entry.isShareProofValidated(), entry.isShareProofRevoked())) {
            total += SHARE_ENTRY_COUNT;
        }
        if (isProofActive(entry.getReviewProofImagePath(), entry.isReviewProofValidated(), entry.isReviewProofRevoked())) {
            total += REVIEW_ENTRY_COUNT;
        }
        return total;
    }

    private GiveawayWheelEntry findEntry(Long entryId) {
        return giveawayWheelEntryRepository.findById(entryId)
                .orElseThrow(() -> new NotFoundException("Giveaway entry not found: " + entryId));
    }

    private void replaceImageIfProvided(MultipartFile file, Consumer<String> pathSetter, Runnable onReplace) {
        if (file == null || file.isEmpty()) {
            return;
        }
        pathSetter.accept(mediaStorageService.storeImage(file, UPLOAD_FOLDER));
        onReplace.run();
    }

    private void ensureFacebookProfileExists(String facebookProfileImagePath, boolean creating) {
        if (hasValue(facebookProfileImagePath)) {
            return;
        }
        throw new IllegalArgumentException(creating
                ? "Facebook profile screenshot is required."
                : "Please upload your Facebook profile screenshot before saving changes.");
    }

    private GiveawayWheelEntrySummaryResponse toSummaryResponse(GiveawayWheelEntry entry) {
        return new GiveawayWheelEntrySummaryResponse(
                entry.getId(),
                entry.getFullName(),
                entry.getEntryCount(),
                entry.getSubmittedEntryCount(),
                entry.isExcludedFromWheel(),
                entry.isWinner(),
                entry.getWonAt(),
                entry.getWinMode(),
                hasValue(entry.getEntryPasswordHash()),
                entry.getStatus(),
                entry.getRejectionReason(),
                entry.getSourceTag(),
                toProofResponse(entry, GiveawayWheelProofType.FOLLOW),
                toProofResponse(entry, GiveawayWheelProofType.COMMENT),
                toProofResponse(entry, GiveawayWheelProofType.SHARE),
                toProofResponse(entry, GiveawayWheelProofType.REVIEW),
                toProofResponse(entry, GiveawayWheelProofType.FACEBOOK_PROFILE),
                entry.getUpdatedAt()
        );
    }

    private GiveawayWheelEntryResponse toResponse(GiveawayWheelEntry entry) {
        return new GiveawayWheelEntryResponse(
                entry.getId(),
                entry.getFullName(),
                entry.getFollowProofImagePath(),
                entry.getCommentProofImagePath(),
                entry.getShareProofImagePath(),
                entry.getReviewProofImagePath(),
                entry.getFacebookProfileImagePath(),
                entry.getEntryCount(),
                entry.getSubmittedEntryCount(),
                entry.isExcludedFromWheel(),
                entry.isWinner(),
                entry.getWonAt(),
                entry.getWinMode(),
                hasValue(entry.getEntryPasswordHash()),
                entry.getStatus(),
                entry.getRejectionReason(),
                entry.getSourceTag(),
                toProofResponse(entry, GiveawayWheelProofType.FOLLOW),
                toProofResponse(entry, GiveawayWheelProofType.COMMENT),
                toProofResponse(entry, GiveawayWheelProofType.SHARE),
                toProofResponse(entry, GiveawayWheelProofType.REVIEW),
                toProofResponse(entry, GiveawayWheelProofType.FACEBOOK_PROFILE),
                entry.getCreatedAt(),
                entry.getUpdatedAt()
        );
    }

    private GiveawayWheelProofResponse toProofResponse(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        String imagePath = getProofImagePath(entry, proofType);
        if (!hasValue(imagePath)) {
            return new GiveawayWheelProofResponse(null, GiveawayWheelProofStatus.NOT_UPLOADED, null);
        }

        boolean revoked = isProofRevoked(entry, proofType);
        boolean validated = isProofValidated(entry, proofType);
        GiveawayWheelProofStatus status = revoked
                ? GiveawayWheelProofStatus.REJECTED
                : validated
                    ? GiveawayWheelProofStatus.APPROVED
                    : GiveawayWheelProofStatus.PENDING;
        return new GiveawayWheelProofResponse(imagePath, status, getProofValidationMessage(entry, proofType));
    }

    private void syncDerivedState(GiveawayWheelEntry entry) {
        entry.setSubmittedEntryCount(calculateSubmittedEntryCount(entry));
        entry.setEntryCount(calculateApprovedEntryCount(entry));
        entry.setStatus(resolveEntryStatus(entry));
        entry.setRejectionReason(buildAggregateRejectionReason(entry));
    }

    private GiveawayWheelEntryStatus resolveEntryStatus(GiveawayWheelEntry entry) {
        if (hasPendingProofs(entry)) {
            return GiveawayWheelEntryStatus.PENDING;
        }
        if (hasRejectedProofs(entry)) {
            return GiveawayWheelEntryStatus.REJECTED;
        }
        if (entry.getEntryCount() > 0) {
            return GiveawayWheelEntryStatus.APPROVED;
        }
        return GiveawayWheelEntryStatus.PENDING;
    }

    private boolean hasPendingProofs(GiveawayWheelEntry entry) {
        return isProofPending(entry, GiveawayWheelProofType.FOLLOW)
                || isProofPending(entry, GiveawayWheelProofType.COMMENT)
                || isProofPending(entry, GiveawayWheelProofType.SHARE)
                || isProofPending(entry, GiveawayWheelProofType.REVIEW)
                || isProofPending(entry, GiveawayWheelProofType.FACEBOOK_PROFILE);
    }

    private boolean hasRejectedProofs(GiveawayWheelEntry entry) {
        return isProofRejected(entry, GiveawayWheelProofType.FOLLOW)
                || isProofRejected(entry, GiveawayWheelProofType.COMMENT)
                || isProofRejected(entry, GiveawayWheelProofType.SHARE)
                || isProofRejected(entry, GiveawayWheelProofType.REVIEW)
                || isProofRejected(entry, GiveawayWheelProofType.FACEBOOK_PROFILE);
    }

    private boolean isProofPending(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        String imagePath = getProofImagePath(entry, proofType);
        return hasValue(imagePath) && !isProofValidated(entry, proofType) && !isProofRevoked(entry, proofType);
    }

    private boolean isProofRejected(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        return hasValue(getProofImagePath(entry, proofType)) && isProofRevoked(entry, proofType);
    }

    private String buildAggregateRejectionReason(GiveawayWheelEntry entry) {
        List<String> reasons = new ArrayList<>();
        appendRejectionReason(reasons, entry, GiveawayWheelProofType.FOLLOW);
        appendRejectionReason(reasons, entry, GiveawayWheelProofType.COMMENT);
        appendRejectionReason(reasons, entry, GiveawayWheelProofType.SHARE);
        appendRejectionReason(reasons, entry, GiveawayWheelProofType.REVIEW);
        appendRejectionReason(reasons, entry, GiveawayWheelProofType.FACEBOOK_PROFILE);
        return reasons.isEmpty() ? null : String.join(" | ", reasons);
    }

    private void appendRejectionReason(List<String> reasons, GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        if (!isProofRejected(entry, proofType)) {
            return;
        }
        String message = getProofValidationMessage(entry, proofType);
        reasons.add(hasValue(message) ? proofType.label() + ": " + message : proofType.label() + ": Re-upload required.");
    }

    private void validateAllUploadedProofs(GiveawayWheelEntry entry) {
        for (GiveawayWheelProofType proofType : GiveawayWheelProofType.values()) {
            if (hasValue(getProofImagePath(entry, proofType))) {
                updateProofState(entry, proofType, true, false, null);
            }
        }
    }

    private void revokeAllUploadedProofs(GiveawayWheelEntry entry, String message) {
        for (GiveawayWheelProofType proofType : GiveawayWheelProofType.values()) {
            if (hasValue(getProofImagePath(entry, proofType))) {
                updateProofState(entry, proofType, false, true, message);
            }
        }
    }

    private void resetProofState(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        updateProofState(entry, proofType, false, false, null);
    }

    private void updateProofState(
            GiveawayWheelEntry entry,
            GiveawayWheelProofType proofType,
            boolean validated,
            boolean revoked,
            String message
    ) {
        ensureProofExists(getProofImagePath(entry, proofType), proofType.label());
        switch (proofType) {
            case FOLLOW -> {
                entry.setFollowProofValidated(validated);
                entry.setFollowProofRevoked(revoked);
                entry.setFollowProofValidationMessage(revoked ? message : null);
            }
            case COMMENT -> {
                entry.setCommentProofValidated(validated);
                entry.setCommentProofRevoked(revoked);
                entry.setCommentProofValidationMessage(revoked ? message : null);
            }
            case SHARE -> {
                entry.setShareProofValidated(validated);
                entry.setShareProofRevoked(revoked);
                entry.setShareProofValidationMessage(revoked ? message : null);
            }
            case REVIEW -> {
                entry.setReviewProofValidated(validated);
                entry.setReviewProofRevoked(revoked);
                entry.setReviewProofValidationMessage(revoked ? message : null);
            }
            case FACEBOOK_PROFILE -> {
                entry.setFacebookProfileValidated(validated);
                entry.setFacebookProfileRevoked(revoked);
                entry.setFacebookProfileValidationMessage(revoked ? message : null);
            }
        }
    }

    private String getProofImagePath(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        return switch (proofType) {
            case FOLLOW -> entry.getFollowProofImagePath();
            case COMMENT -> entry.getCommentProofImagePath();
            case SHARE -> entry.getShareProofImagePath();
            case REVIEW -> entry.getReviewProofImagePath();
            case FACEBOOK_PROFILE -> entry.getFacebookProfileImagePath();
        };
    }

    private boolean isProofValidated(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        return switch (proofType) {
            case FOLLOW -> entry.isFollowProofValidated();
            case COMMENT -> entry.isCommentProofValidated();
            case SHARE -> entry.isShareProofValidated();
            case REVIEW -> entry.isReviewProofValidated();
            case FACEBOOK_PROFILE -> entry.isFacebookProfileValidated();
        };
    }

    private boolean isProofRevoked(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        return switch (proofType) {
            case FOLLOW -> entry.isFollowProofRevoked();
            case COMMENT -> entry.isCommentProofRevoked();
            case SHARE -> entry.isShareProofRevoked();
            case REVIEW -> entry.isReviewProofRevoked();
            case FACEBOOK_PROFILE -> entry.isFacebookProfileRevoked();
        };
    }

    private String getProofValidationMessage(GiveawayWheelEntry entry, GiveawayWheelProofType proofType) {
        return switch (proofType) {
            case FOLLOW -> entry.getFollowProofValidationMessage();
            case COMMENT -> entry.getCommentProofValidationMessage();
            case SHARE -> entry.getShareProofValidationMessage();
            case REVIEW -> entry.getReviewProofValidationMessage();
            case FACEBOOK_PROFILE -> entry.getFacebookProfileValidationMessage();
        };
    }

    private boolean isProofActive(String imagePath, boolean validated, boolean revoked) {
        return hasValue(imagePath) && validated && !revoked;
    }

    private void ensureProofExists(String imagePath, String label) {
        if (hasValue(imagePath)) {
            return;
        }
        throw new IllegalArgumentException(label + " is not uploaded.");
    }

    private String requireFullName(String fullName) {
        String normalized = normalizeText(fullName);
        if (normalized.length() < 2) {
            throw new IllegalArgumentException("Full name must be at least 2 characters.");
        }
        return normalized;
    }

    private String requireEntryPassword(String entryPassword) {
        String normalized = normalizeText(entryPassword);
        if (!hasValue(normalized)) {
            throw new IllegalArgumentException("Entry password is required.");
        }
        return normalized;
    }

    private void ensureUniqueFullName(String fullName, Long currentEntryId, boolean creating) {
        boolean duplicateExists = giveawayWheelEntryRepository.existsRegularEntryNameConflict(fullName, creating ? null : currentEntryId);
        if (duplicateExists) {
            throw new IllegalArgumentException("This full name is already registered in Giveaway 2.");
        }
    }

    private boolean isImportedFromGiveaway1(GiveawayWheelEntry entry) {
        return hasValue(entry.getSourceTag()) && GIVEAWAY_1_SOURCE_TAG.equalsIgnoreCase(entry.getSourceTag().trim());
    }

    private void ensureUpdatePasswordAllowed(GiveawayWheelEntry entry, String entryPassword) {
        if (!hasValue(entry.getEntryPasswordHash())) {
            return;
        }
        String normalizedPassword = normalizeText(entryPassword);
        if (!hasValue(normalizedPassword)) {
            throw new IllegalArgumentException("Entry password is required to update this entry.");
        }
        if (!passwordEncoder.matches(normalizedPassword, entry.getEntryPasswordHash())) {
            throw new IllegalArgumentException("Invalid entry password.");
        }
    }

    private void validateEntryAccessPassword(GiveawayWheelEntry entry, String entryPassword) {
        if (!hasValue(entry.getEntryPasswordHash())) {
            return;
        }
        String normalizedPassword = normalizeText(entryPassword);
        if (!hasValue(normalizedPassword)) {
            throw new IllegalArgumentException("Entry password required.");
        }
        if (!passwordEncoder.matches(normalizedPassword, entry.getEntryPasswordHash())) {
            throw new IllegalArgumentException("Invalid entry password.");
        }
    }

    private void upsertEntryPassword(GiveawayWheelEntry entry, String entryPassword, boolean creating) {
        String normalizedPassword = normalizeText(entryPassword);
        if (!hasValue(normalizedPassword)) {
            if (creating) {
                entry.setEntryPasswordHash(null);
            }
            return;
        }
        if (normalizedPassword.length() < 4) {
            throw new IllegalArgumentException("Entry password must be at least 4 characters.");
        }
        entry.setEntryPasswordHash(passwordEncoder.encode(normalizedPassword));
    }

    private String requireMessage(String message) {
        String normalized = normalizeText(message);
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Rejection message is required.");
        }
        return normalized;
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean hasValue(String value) {
        return value != null && !value.trim().isEmpty();
    }
}


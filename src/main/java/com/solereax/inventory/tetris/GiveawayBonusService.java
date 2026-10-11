package com.solereax.inventory.tetris;

import com.solereax.inventory.notification.PlayerNotificationService;
import com.solereax.inventory.notification.PlayerNotificationType;
import com.solereax.inventory.shared.NotFoundException;
import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.solereax.inventory.settings.ImageCompressionService;

@Service
public class GiveawayBonusService {
    public static final int FOLLOW_BONUS_POINTS = 2500;
    public static final int REVIEW_BONUS_POINTS = 5000;

    private static final String FOLLOW_BONUS_TYPE = "follow";
    private static final String REVIEW_BONUS_TYPE = "review";
    private static final String COMMENT_BONUS_TYPE = "comment";

    private final AppUserRepository appUserRepository;
    private final TetrisLeaderboardRepository tetrisLeaderboardRepository;
    private final ImageCompressionService imageCompressionService;
    private final PlayerNotificationService playerNotificationService;

    @Value("${app.upload.profile-images-dir:uploads/profile-images}")
    private String uploadDir;

    @Autowired
    public GiveawayBonusService(
            AppUserRepository appUserRepository,
            TetrisLeaderboardRepository tetrisLeaderboardRepository,
            ImageCompressionService imageCompressionService,
            PlayerNotificationService playerNotificationService
    ) {
        this.appUserRepository = appUserRepository;
        this.tetrisLeaderboardRepository = tetrisLeaderboardRepository;
        this.imageCompressionService = imageCompressionService;
        this.playerNotificationService = playerNotificationService;
    }

    public GiveawayBonusService(
            AppUserRepository appUserRepository,
            TetrisLeaderboardRepository tetrisLeaderboardRepository,
            PlayerNotificationService playerNotificationService
    ) {
        this(appUserRepository, tetrisLeaderboardRepository, new ImageCompressionService(), playerNotificationService);
    }

    @Transactional(readOnly = true)
    public GiveawayBonusStatusResponse getBonusStatus(String username) {
        AppUser user = findUser(username);
        return toBonusStatus(user);
    }

    @Transactional(readOnly = true)
    public GiveawayBonusStatusResponse getBonusStatus(AppUser user) {
        return toBonusStatus(user);
    }

    @Transactional
    public GiveawayBonusUploadResponse uploadFollowProof(String username, MultipartFile file) throws IOException {
        AppUser user = findUser(username);
        boolean wasActive = isFollowBonusActive(user);
        validateImage(file, "Follow proof image");
        String savedPath = saveImage(file, "follow-proof");
        user.setFollowProofImagePath(savedPath);
        user.setFollowProofImageFilename(file.getOriginalFilename());
        user.setFollowProofValidated(true);
        user.setFollowProofRevoked(false);
        user.setFollowProofValidationMessage(null);
        appUserRepository.save(user);
        applyLeaderboardBonusDelta(user.getUsername(), wasActive, isFollowBonusActive(user), FOLLOW_BONUS_POINTS);
        playerNotificationService.clearNotificationsByType(user.getId(), PlayerNotificationType.FOLLOW_PROOF_REJECTED);
        return new GiveawayBonusUploadResponse("Follow proof uploaded and validated. Your follow bonus is now active for authenticated score submissions.", toBonusStatus(user));
    }

    @Transactional
    public GiveawayBonusUploadResponse uploadReviewProof(String username, MultipartFile file) throws IOException {
        AppUser user = findUser(username);
        boolean wasActive = isReviewBonusActive(user);
        validateImage(file, "Review proof image");
        String savedPath = saveImage(file, "review-proof");
        user.setReviewProofImagePath(savedPath);
        user.setReviewProofImageFilename(file.getOriginalFilename());
        user.setReviewProofValidated(true);
        user.setReviewProofRevoked(false);
        user.setReviewProofValidationMessage(null);
        appUserRepository.save(user);
        applyLeaderboardBonusDelta(user.getUsername(), wasActive, isReviewBonusActive(user), REVIEW_BONUS_POINTS);
        playerNotificationService.clearNotificationsByType(user.getId(), PlayerNotificationType.REVIEW_PROOF_REJECTED);
        return new GiveawayBonusUploadResponse("Review proof uploaded and validated. Your review bonus is now active for authenticated score submissions.", toBonusStatus(user));
    }

    @Transactional
    public GiveawayBonusUploadResponse uploadCommentProof(String username, MultipartFile file) throws IOException {
        AppUser user = findUser(username);
        validateImage(file, "Comment tag proof image");
        String savedPath = saveImage(file, "comment-proof");
        user.setCommentProofImagePath(savedPath);
        user.setCommentProofImageFilename(file.getOriginalFilename());
        user.setCommentProofValidated(true);
        user.setCommentProofRevoked(false);
        user.setCommentProofValidationMessage(null);
        appUserRepository.save(user);
        playerNotificationService.clearNotificationsByType(user.getId(), PlayerNotificationType.COMMENT_PROOF_REJECTED);
        return new GiveawayBonusUploadResponse(
                "Comment tag proof uploaded successfully. Your giveaway entry proof is now on file.",
                toBonusStatus(user)
        );
    }

    @Transactional
    public GiveawayBonusStatusResponse validateProof(Long userId, String bonusType) {
        return updateProofState(userId, bonusType, true, false, null);
    }

    @Transactional
    public GiveawayBonusStatusResponse revokeProof(Long userId, String bonusType, String message) {
        return updateProofState(userId, bonusType, false, true, message);
    }

    @Transactional(readOnly = true)
    public int getActiveBonusPoints(String username) {
        GiveawayBonusStatusResponse status = getBonusStatus(username);
        return status.totalBonusPoints();
    }

    @Transactional(readOnly = true)
    public int getActiveBonusPointsOrZero(String username) {
        if (!hasValue(username)) {
            return 0;
        }

        Optional<AppUser> user = appUserRepository.findByUsernameIgnoreCase(username);
        return user.map(this::toBonusStatus)
                .map(GiveawayBonusStatusResponse::totalBonusPoints)
                .orElse(0);
    }

    private GiveawayBonusStatusResponse toBonusStatus(AppUser user) {
        boolean hasFollowProof = hasValue(user.getFollowProofImagePath());
        boolean hasReviewProof = hasValue(user.getReviewProofImagePath());
        boolean hasCommentProof = hasValue(user.getCommentProofImagePath());
        boolean followValidated = hasFollowProof && user.isFollowProofValidated() && !user.isFollowProofRevoked();
        boolean followRevoked = hasFollowProof && user.isFollowProofRevoked();
        boolean reviewValidated = hasReviewProof && user.isReviewProofValidated() && !user.isReviewProofRevoked();
        boolean reviewRevoked = hasReviewProof && user.isReviewProofRevoked();
        boolean commentValidated = hasCommentProof && user.isCommentProofValidated() && !user.isCommentProofRevoked();
        boolean commentRevoked = hasCommentProof && user.isCommentProofRevoked();
        int followPoints = followValidated ? FOLLOW_BONUS_POINTS : 0;
        int reviewPoints = reviewValidated ? REVIEW_BONUS_POINTS : 0;
        return new GiveawayBonusStatusResponse(
                hasFollowProof,
                user.getFollowProofImagePath(),
                followValidated,
                followRevoked,
                user.getFollowProofValidationMessage(),
                hasReviewProof,
                user.getReviewProofImagePath(),
                reviewValidated,
                reviewRevoked,
                user.getReviewProofValidationMessage(),
                hasCommentProof,
                user.getCommentProofImagePath(),
                commentValidated,
                commentRevoked,
                user.getCommentProofValidationMessage(),
                followPoints,
                reviewPoints,
                followPoints + reviewPoints
        );
    }

    private GiveawayBonusStatusResponse updateProofState(Long userId, String bonusType, boolean validated, boolean revoked, String message) {
        AppUser user = findUser(userId);
        String normalizedBonusType = normalizeBonusType(bonusType);
        boolean wasActive = FOLLOW_BONUS_TYPE.equals(normalizedBonusType)
                ? isFollowBonusActive(user)
                : REVIEW_BONUS_TYPE.equals(normalizedBonusType)
                    ? isReviewBonusActive(user)
                    : isCommentProofActive(user);

        if (FOLLOW_BONUS_TYPE.equals(normalizedBonusType)) {
            ensureProofExists(user.getFollowProofImagePath(), "Follow proof");
            user.setFollowProofValidated(validated);
            user.setFollowProofRevoked(revoked);
            user.setFollowProofValidationMessage(revoked ? requireMessage(message) : null);
        } else if (REVIEW_BONUS_TYPE.equals(normalizedBonusType)) {
            ensureProofExists(user.getReviewProofImagePath(), "Review proof");
            user.setReviewProofValidated(validated);
            user.setReviewProofRevoked(revoked);
            user.setReviewProofValidationMessage(revoked ? requireMessage(message) : null);
        } else if (COMMENT_BONUS_TYPE.equals(normalizedBonusType)) {
            ensureProofExists(user.getCommentProofImagePath(), "Comment tag proof");
            user.setCommentProofValidated(validated);
            user.setCommentProofRevoked(revoked);
            user.setCommentProofValidationMessage(revoked ? requireMessage(message) : null);
        }

        appUserRepository.save(user);

        if (FOLLOW_BONUS_TYPE.equals(normalizedBonusType)) {
            applyLeaderboardBonusDelta(user.getUsername(), wasActive, isFollowBonusActive(user), FOLLOW_BONUS_POINTS);
        } else if (REVIEW_BONUS_TYPE.equals(normalizedBonusType)) {
            applyLeaderboardBonusDelta(user.getUsername(), wasActive, isReviewBonusActive(user), REVIEW_BONUS_POINTS);
        }

        if (FOLLOW_BONUS_TYPE.equals(normalizedBonusType)) {
            if (revoked) {
                playerNotificationService.sendSystemNotification(
                        user.getId(),
                        PlayerNotificationType.FOLLOW_PROOF_REJECTED,
                        "Follow proof needs re-upload",
                        user.getFollowProofValidationMessage()
                );
            } else {
                playerNotificationService.clearNotificationsByType(user.getId(), PlayerNotificationType.FOLLOW_PROOF_REJECTED);
            }
        } else if (REVIEW_BONUS_TYPE.equals(normalizedBonusType)) {
            if (revoked) {
                playerNotificationService.sendSystemNotification(
                        user.getId(),
                        PlayerNotificationType.REVIEW_PROOF_REJECTED,
                        "Review proof needs re-upload",
                        user.getReviewProofValidationMessage()
                );
            } else {
                playerNotificationService.clearNotificationsByType(user.getId(), PlayerNotificationType.REVIEW_PROOF_REJECTED);
            }
        } else if (COMMENT_BONUS_TYPE.equals(normalizedBonusType)) {
            if (revoked) {
                playerNotificationService.sendSystemNotification(
                        user.getId(),
                        PlayerNotificationType.COMMENT_PROOF_REJECTED,
                        "Giveaway comment proof needs re-upload",
                        user.getCommentProofValidationMessage()
                );
            } else {
                playerNotificationService.clearNotificationsByType(user.getId(), PlayerNotificationType.COMMENT_PROOF_REJECTED);
            }
        }

        return toBonusStatus(user);
    }

    private boolean isFollowBonusActive(AppUser user) {
        return hasValue(user.getFollowProofImagePath()) && user.isFollowProofValidated() && !user.isFollowProofRevoked();
    }

    private boolean isReviewBonusActive(AppUser user) {
        return hasValue(user.getReviewProofImagePath()) && user.isReviewProofValidated() && !user.isReviewProofRevoked();
    }

    private boolean isCommentProofActive(AppUser user) {
        return hasValue(user.getCommentProofImagePath()) && user.isCommentProofValidated() && !user.isCommentProofRevoked();
    }

    private void applyLeaderboardBonusDelta(String username, boolean wasActive, boolean isActive, int bonusPoints) {
        if (wasActive == isActive || !hasValue(username)) {
            return;
        }

        int delta = isActive ? bonusPoints : -bonusPoints;
        tetrisLeaderboardRepository.findByPlayerNameIgnoreCase(username).ifPresent(entry -> {
            int currentScore = entry.getHighestScore() != null ? entry.getHighestScore() : 0;
            entry.setHighestScore(Math.max(currentScore + delta, 0));
            tetrisLeaderboardRepository.save(entry);
        });
    }

    private AppUser findUser(String username) {
        return appUserRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));
    }

    private AppUser findUser(Long userId) {
        return appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private void ensureProofExists(String proofPath, String label) {
        if (!hasValue(proofPath)) {
            throw new NotFoundException(label + " not uploaded yet.");
        }
    }

    private String normalizeBonusType(String bonusType) {
        String value = bonusType == null ? "" : bonusType.trim().toLowerCase(Locale.ROOT);
        if (FOLLOW_BONUS_TYPE.equals(value) || REVIEW_BONUS_TYPE.equals(value) || COMMENT_BONUS_TYPE.equals(value)) {
            return value;
        }
        throw new IllegalArgumentException("Unknown bonus type: " + bonusType);
    }

    private void validateImage(MultipartFile file, String label) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(label + " is required.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException(label + " must be an image file.");
        }
        if (file.getSize() > ImageCompressionService.MAX_UPLOAD_SIZE_BYTES) {
            throw new IllegalArgumentException(label + " must be less than 25MB before compression.");
        }
    }

    private String saveImage(MultipartFile file, String prefix) throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        ImageCompressionService.PreparedImage preparedImage = imageCompressionService.prepareForStorage(file);
        String fileExtension = getFileExtension(file.getOriginalFilename(), preparedImage.extension());
        String uniqueFilename = prefix + "-" + UUID.randomUUID() + "." + fileExtension;
        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.write(filePath, preparedImage.bytes());
        return "uploads/profile-images/" + uniqueFilename;
    }

    private String getFileExtension(String filename, String fallbackExtension) {
        if (filename == null || !filename.contains(".")) {
            return fallbackExtension == null || fallbackExtension.isBlank() ? "jpg" : fallbackExtension;
        }
        String extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (extension.isBlank()) {
            return fallbackExtension == null || fallbackExtension.isBlank() ? "jpg" : fallbackExtension;
        }
        return extension;
    }

    private boolean hasValue(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String requireMessage(String message) {
        String sanitized = message == null ? "" : message.trim();
        if (sanitized.isEmpty()) {
            throw new IllegalArgumentException("Message is required.");
        }
        return sanitized;
    }
}


package com.solereax.inventory.tetris;

import com.solereax.inventory.shared.NotFoundException;
import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;
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

    private final AppUserRepository appUserRepository;
    private final ImageCompressionService imageCompressionService;

    @Value("${app.upload.profile-images-dir:uploads/profile-images}")
    private String uploadDir;

    @Autowired
    public GiveawayBonusService(AppUserRepository appUserRepository, ImageCompressionService imageCompressionService) {
        this.appUserRepository = appUserRepository;
        this.imageCompressionService = imageCompressionService;
    }

    public GiveawayBonusService(AppUserRepository appUserRepository) {
        this(appUserRepository, new ImageCompressionService());
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
        validateImage(file, "Follow proof image");
        String savedPath = saveImage(file, "follow-proof");
        user.setFollowProofImagePath(savedPath);
        user.setFollowProofImageFilename(file.getOriginalFilename());
        user.setFollowProofValidated(true);
        user.setFollowProofRevoked(false);
        appUserRepository.save(user);
        return new GiveawayBonusUploadResponse("Follow proof uploaded and validated. Your follow bonus is now active for authenticated score submissions.", toBonusStatus(user));
    }

    @Transactional
    public GiveawayBonusUploadResponse uploadReviewProof(String username, MultipartFile file) throws IOException {
        AppUser user = findUser(username);
        validateImage(file, "Review proof image");
        String savedPath = saveImage(file, "review-proof");
        user.setReviewProofImagePath(savedPath);
        user.setReviewProofImageFilename(file.getOriginalFilename());
        user.setReviewProofValidated(true);
        user.setReviewProofRevoked(false);
        appUserRepository.save(user);
        return new GiveawayBonusUploadResponse("Review proof uploaded and validated. Your review bonus is now active for authenticated score submissions.", toBonusStatus(user));
    }

    @Transactional
    public GiveawayBonusStatusResponse validateProof(Long userId, String bonusType) {
        return updateProofState(userId, bonusType, true, false);
    }

    @Transactional
    public GiveawayBonusStatusResponse revokeProof(Long userId, String bonusType) {
        return updateProofState(userId, bonusType, false, true);
    }

    @Transactional(readOnly = true)
    public int getActiveBonusPoints(String username) {
        GiveawayBonusStatusResponse status = getBonusStatus(username);
        return status.totalBonusPoints();
    }

    private GiveawayBonusStatusResponse toBonusStatus(AppUser user) {
        boolean hasFollowProof = hasValue(user.getFollowProofImagePath());
        boolean hasReviewProof = hasValue(user.getReviewProofImagePath());
        boolean followValidated = hasFollowProof && user.isFollowProofValidated() && !user.isFollowProofRevoked();
        boolean followRevoked = hasFollowProof && user.isFollowProofRevoked();
        boolean reviewValidated = hasReviewProof && user.isReviewProofValidated() && !user.isReviewProofRevoked();
        boolean reviewRevoked = hasReviewProof && user.isReviewProofRevoked();
        int followPoints = followValidated ? FOLLOW_BONUS_POINTS : 0;
        int reviewPoints = reviewValidated ? REVIEW_BONUS_POINTS : 0;
        return new GiveawayBonusStatusResponse(
                hasFollowProof,
                user.getFollowProofImagePath(),
                followValidated,
                followRevoked,
                hasReviewProof,
                user.getReviewProofImagePath(),
                reviewValidated,
                reviewRevoked,
                followPoints,
                reviewPoints,
                followPoints + reviewPoints
        );
    }

    private GiveawayBonusStatusResponse updateProofState(Long userId, String bonusType, boolean validated, boolean revoked) {
        AppUser user = findUser(userId);
        String normalizedBonusType = normalizeBonusType(bonusType);

        if (FOLLOW_BONUS_TYPE.equals(normalizedBonusType)) {
            ensureProofExists(user.getFollowProofImagePath(), "Follow proof");
            user.setFollowProofValidated(validated);
            user.setFollowProofRevoked(revoked);
        } else if (REVIEW_BONUS_TYPE.equals(normalizedBonusType)) {
            ensureProofExists(user.getReviewProofImagePath(), "Review proof");
            user.setReviewProofValidated(validated);
            user.setReviewProofRevoked(revoked);
        }

        appUserRepository.save(user);
        return toBonusStatus(user);
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
        if (FOLLOW_BONUS_TYPE.equals(value) || REVIEW_BONUS_TYPE.equals(value)) {
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
}


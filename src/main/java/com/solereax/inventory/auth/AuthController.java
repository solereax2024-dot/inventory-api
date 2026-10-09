package com.solereax.inventory.auth;

import com.solereax.inventory.security.JwtService;
import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.UserRole;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.upload.profile-images-dir:uploads/profile-images}")
    private String uploadDir;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        AppUser user = appUserRepository.findByUsernameIgnoreCase(request.username().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }
        if (!user.isEnabled()) {
            throw new BadCredentialsException("This account is disabled.");
        }

        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());
        return new LoginResponse(token, user.getUsername(), user.getFullName(), user.getRole().name());
    }

    @PostMapping(value = "/register", consumes = {"multipart/form-data"})
    public ResponseEntity<RegistrationResponse> register(
            @RequestParam String fullName,
            @RequestParam String username,
            @RequestParam String password,
            @RequestParam(defaultValue = "false") boolean facebookWinnerContactConsent,
            @RequestParam(required = false) MultipartFile profileImage
    ) {
        try {
            // Validate input
            if (fullName == null || fullName.trim().isEmpty() || fullName.length() < 2) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegistrationResponse("Full name must be at least 2 characters", null, null, null, null));
            }

            if (username == null || username.trim().isEmpty() || username.length() < 3) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegistrationResponse("Username must be at least 3 characters", null, null, null, null));
            }

            if (password == null || password.length() < 6) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegistrationResponse("Password must be at least 6 characters", null, null, null, null));
            }

            if (profileImage == null || profileImage.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegistrationResponse("Facebook profile image is required", null, null, null, null));
            }

            if (!facebookWinnerContactConsent) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegistrationResponse("You must agree to be contacted via Facebook if you win.", null, null, null, null));
            }

            String contentType = profileImage.getContentType();
            if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegistrationResponse("Facebook profile image must be an image file", null, null, null, null));
            }

            // Check if username already exists
            if (appUserRepository.existsByUsernameIgnoreCase(username.trim())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new RegistrationResponse("Username already exists", null, null, null, null));
            }

            // Create new user
            AppUser newUser = new AppUser();
            newUser.setFullName(fullName.trim());
            newUser.setUsername(username.trim());
            newUser.setPasswordHash(passwordEncoder.encode(password));
            newUser.setRole(UserRole.CUSTOMER);
            newUser.setEnabled(true);
            newUser.setFacebookWinnerContactConsent(true);

            // Handle profile image upload
            if (profileImage != null && !profileImage.isEmpty()) {
                try {
                    String profileImagePath = saveProfileImage(profileImage);
                    newUser.setProfileImagePath(profileImagePath);
                    newUser.setProfileImageFilename(profileImage.getOriginalFilename());
                } catch (IOException e) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(new RegistrationResponse("Failed to upload Facebook profile image: " + e.getMessage(), null, null, null, null));
                }
            }

            // Save user to database
            AppUser savedUser = appUserRepository.save(newUser);

            // Generate JWT token
            String token = jwtService.generateToken(savedUser.getUsername(), savedUser.getRole().name());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new RegistrationResponse(
                            "Registration successful",
                            savedUser.getUsername(),
                            savedUser.getFullName(),
                            token,
                            savedUser.getRole().name()
                    ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegistrationResponse("Registration failed: " + e.getMessage(), null, null, null, null));
        }
    }

    private String saveProfileImage(MultipartFile file) throws IOException {
        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String fileExtension = getFileExtension(file.getOriginalFilename());
        String uniqueFilename = UUID.randomUUID() + "." + fileExtension;
        Path filePath = uploadPath.resolve(uniqueFilename);

        // Save file
        Files.write(filePath, file.getBytes());

        // Return relative path for database storage
        return "uploads/profile-images/" + uniqueFilename;
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}


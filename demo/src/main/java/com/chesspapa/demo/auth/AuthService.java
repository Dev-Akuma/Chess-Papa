package com.chesspapa.demo.auth;

import com.chesspapa.demo.user.User;
import com.chesspapa.demo.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public LoginResponse login(String username, String password) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }

        String token = jwtTokenProvider.generateToken(username);
        return new LoginResponse(username, token);
    }

    public LoginResponse register(String username, String password, String email) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }

        String encodedPassword = passwordEncoder.encode(password);
        User user = new User(username, encodedPassword, email);
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(username);
        return new LoginResponse(username, token);
    }
}

package com.roo.payment.security;

import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Spring Security DaoAuthenticationProvider 용 UserDetailsService.
 * 이메일 미인증 계정은 enabled=false 로 반환 → DisabledException → AuthService에서 구분 처리.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                user.isEmailVerified(),  // enabled — false → Spring throws DisabledException
                true,                    // accountNonExpired
                true,                    // credentialsNonExpired
                true,                    // accountNonLocked (brute-force handled in LoginAttemptService)
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }
}

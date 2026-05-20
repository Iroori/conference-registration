package com.roo.payment.domain.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roo.payment.domain.user.dto.ChangeMemberTypeRequest;
import com.roo.payment.domain.user.entity.MemberType;
import com.roo.payment.domain.user.entity.User;
import com.roo.payment.domain.user.repository.UserRepository;
import com.roo.payment.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminUserControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User adminUser;
    private User normalUser;
    private String adminToken;
    private String normalToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(springSecurity())
                .build();

        // Create an Admin user
        adminUser = new User("admin-test@kibse.or.kr", "password", "System", "Admin", 
                "KIBSE", "Manager", "KR", "+82-10-0000-0000", LocalDate.of(1985, 1, 1), MemberType.MEMBER);
        adminUser.promoteToAdmin();
        adminUser.verifyEmail();
        userRepository.save(adminUser);

        // Create a Normal user
        normalUser = new User("user-test@test.com", "password", "Gildong", "Hong", 
                "POSTECH", "Student", "KR", "+82-10-1111-2222", LocalDate.of(1998, 5, 10), MemberType.YOUNG_ENGINEER);
        normalUser.verifyEmail();
        userRepository.save(normalUser);

        // Generate tokens
        adminToken = "Bearer " + jwtTokenProvider.generateToken(adminUser.getEmail(), adminUser.getMemberType().name(), true);
        normalToken = "Bearer " + jwtTokenProvider.generateToken(normalUser.getEmail(), normalUser.getMemberType().name(), false);
    }

    @Test
    @DisplayName("일반 사용자가 어드민 API 호출 시 403 Forbidden 차단 검증")
    void testAccessDeniedForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", normalToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("어드민 사용자가 어드민 API 호출 시 200 OK 정상 접근 검증")
    void testAccessAllowedForAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("어드민 사용자가 특정 유저의 등급을 수동으로 변경 시 DB 반영 및 200 OK 검증")
    void testChangeMemberTypeByAdmin() throws Exception {
        ChangeMemberTypeRequest request = new ChangeMemberTypeRequest(MemberType.MEMBER);

        mockMvc.perform(put("/api/admin/users/" + normalUser.getId() + "/member-type")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Verify database state
        User updated = userRepository.findById(normalUser.getId()).orElseThrow();
        assertEquals(MemberType.MEMBER, updated.getMemberType());
    }
}

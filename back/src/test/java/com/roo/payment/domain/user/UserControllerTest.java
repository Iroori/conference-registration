package com.roo.payment.domain.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roo.payment.domain.user.dto.UpdateProfileRequest;
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

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User testUser;
    private String userToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(springSecurity())
                .build();

        // Create a test user
        testUser = new User("profile-test@test.com", "password", "Gil-dong", "Hong",
                "KIBSE University", "Professor", "South Korea", "+82-10-1234-5678",
                LocalDate.of(1980, 10, 10), MemberType.MEMBER);
        testUser.verifyEmail();
        testUser.setPresenter(false);
        testUser.setAuthor(false);
        testUser.assignPaperInfo("");
        testUser.assignBillingAddress("Org", "Vat", "PoNum", "Street", "AddInfo", "PoBox", "12345", "City", "South Korea");
        userRepository.save(testUser);

        // Generate token
        userToken = "Bearer " + jwtTokenProvider.generateToken(testUser.getEmail(), testUser.getMemberType().name(), false);
    }

    @Test
    @DisplayName("사용자 프로필 및 Paper Author/Presenter Status 정보 수정 성공 및 DB 반영 검증")
    void testUpdateProfileAndPaperStatus() throws Exception {
        UpdateProfileRequest request = new UpdateProfileRequest(
                "Gildong-Updated",
                "Hong-Updated",
                "KIBSE University Updated",
                "South Korea",
                "Professor",
                "+82-10-9876-5432",
                "Org Updated",
                "Vat Updated",
                "PoNum Updated",
                "Street Updated",
                "AddInfo Updated",
                "PoBox Updated",
                "54321",
                "City Updated",
                "South Korea",
                true, // isPresenter
                true, // isAuthor
                "Paper #101: A Study on Antigravity" // paperInfo
        );

        mockMvc.perform(put("/api/user/profile")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.firstName").value("Gildong-Updated"))
                .andExpect(jsonPath("$.data.isPresenter").value(true))
                .andExpect(jsonPath("$.data.isAuthor").value(true))
                .andExpect(jsonPath("$.data.paperInfo").value("Paper #101: A Study on Antigravity"));

        // Verify database state
        User updatedUser = userRepository.findByEmailAndActiveTrue(testUser.getEmail()).orElseThrow();
        assertEquals("Gildong-Updated", updatedUser.getFirstName());
        assertEquals("Hong-Updated", updatedUser.getLastName());
        assertEquals("KIBSE University Updated", updatedUser.getAffiliation());
        assertTrue(updatedUser.isPresenter());
        assertTrue(updatedUser.isAuthor());
        assertEquals("Paper #101: A Study on Antigravity", updatedUser.getPaperInfo());
    }
}

package com.sentinelx.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.repository.RuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import static org.assertj.core.api.Assertions.assertThat;
import java.util.Optional;

import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RuleRepository ruleRepository;

    @Test
    void contextLoads() {
        // Assert that the seeder successfully inserted records
        long userCount = userRepository.count();
        long ruleCount = ruleRepository.count();
        
        assertThat(userCount).isGreaterThanOrEqualTo(3);
        assertThat(ruleCount).isGreaterThanOrEqualTo(5);
        
        // Assert Rule 01 fields
        var rule = ruleRepository.findById("RULE_01");
        assertThat(rule).isPresent();
        assertThat(rule.get().getName()).isEqualTo("High Velocity (5m)");
        
        // Test CRUD: Create new user
        User testUser = User.builder()
                .id("usr_test_99")
                .email("testrunner@example.com")
                .riskSegment("HIGH")
                .build();
                
        userRepository.save(testUser);
        
        Optional<User> found = userRepository.findById("usr_test_99");
        assertThat(found).isPresent();
        assertThat(found.get().getRiskSegment()).isEqualTo("HIGH");
        
        // Test CRUD: Delete user
        userRepository.delete(testUser);
        assertThat(userRepository.findById("usr_test_99")).isEmpty();
    }

}

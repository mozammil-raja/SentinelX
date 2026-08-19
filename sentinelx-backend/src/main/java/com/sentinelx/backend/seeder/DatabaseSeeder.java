package com.sentinelx.backend.seeder;

import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.RuleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.List;

/**
 * Automated database seeder that runs on application startup via {@link CommandLineRunner}.
 * 
 * <p>Populates the local PostgreSQL database with baseline mock users (with varied risk tiers),
 * trusted device fingerprints, and five core production-ready fraud detection rules.
 * All seed operations are idempotent to prevent duplicate row insertions on subsequent restarts.</p>
 */
@Slf4j
@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final RuleRepository ruleRepository;

    /**
     * Spring dependency injection constructor.
     */
    public DatabaseSeeder(UserRepository userRepository, 
                          DeviceRepository deviceRepository, 
                          RuleRepository ruleRepository) {
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.ruleRepository = ruleRepository;
    }

    /**
     * Primary execution entrypoint triggered immediately after the Spring application context initializes.
     */
    @Override
    public void run(String... args) throws Exception {
        seedUsers();
        seedDevices();
        seedRules();
        log.info("--- SentinelX Database Seeding Completed ---");
    }

    /**
     * Seeds mock user accounts representing distinct risk segments (LOW, MEDIUM, HIGH).
     */
    private void seedUsers() {
        if (userRepository.count() == 0) {
            User alice = User.builder().id("usr_1001").email("alice@example.com").riskSegment("LOW").build();
            User bob = User.builder().id("usr_1002").email("bob@example.com").riskSegment("MEDIUM").build();
            User charlie = User.builder().id("usr_1003").email("charlie@example.com").riskSegment("HIGH").build();
            userRepository.saveAll(List.of(alice, bob, charlie));
            log.info("Mock Users Seeded.");
        }
    }

    /**
     * Seeds initial trusted hardware device profiles for mock users Alice and Bob.
     */
    private void seedDevices() {
        if (deviceRepository.count() == 0) {
            User alice = userRepository.findById("usr_1001").orElse(null);
            User bob = userRepository.findById("usr_1002").orElse(null);
            
            if (alice != null) {
                Device dev1 = Device.builder()
                        .id("dev_alice_phone")
                        .user(alice)
                        .fingerprint("fp_alice_iphone15_sha256")
                        .ipAddress("198.51.100.10")
                        .os("iOS")
                        .browser("Safari")
                        .isTrusted(true)
                        .build();
                deviceRepository.save(dev1);
            }
            
            if (bob != null) {
                Device dev2 = Device.builder()
                        .id("dev_bob_laptop")
                        .user(bob)
                        .fingerprint("fp_bob_macbook_sha256")
                        .ipAddress("203.0.113.50")
                        .os("macOS")
                        .browser("Chrome")
                        .isTrusted(true)
                        .build();
                deviceRepository.save(dev2);
            }
            log.info("Mock Devices Seeded.");
        }
    }

    /**
     * Seeds 5 core baseline fraud detection rules:
     * 1. RULE_01: High Velocity (5m) (weight: 40)
     * 2. RULE_02: New Device (weight: 30)
     * 3. RULE_03: High-Value Transaction (weight: 50)
     * 4. RULE_04: Geolocation Hop (weight: 60)
     * 5. RULE_05: Blacklisted Merchant (weight: 80)
     */
    private void seedRules() {
        if (ruleRepository.count() == 0) {
            Rule r1 = Rule.builder()
                    .id("RULE_01")
                    .name("High Velocity (5m)")
                    .description("Triggers if user makes more than 5 transactions in 5 minutes")
                    .conditionJson("{\"window\": 300, \"limit\": 5}")
                    .weight(40)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build();

            Rule r2 = Rule.builder()
                    .id("RULE_02")
                    .name("New Device")
                    .description("Triggers if the device footprint is unrecognized for this user")
                    .conditionJson("{\"trustedOnly\": true}")
                    .weight(30)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build();

            Rule r3 = Rule.builder()
                    .id("RULE_03")
                    .name("High-Value Transaction")
                    .description("Triggers if transaction amount exceeds $10,000")
                    .conditionJson("{\"threshold\": 10000}")
                    .weight(50)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build();

            Rule r4 = Rule.builder()
                    .id("RULE_04")
                    .name("Geolocation Hop")
                    .description("Triggers if transaction IP country differs from last seen country in 30 minutes")
                    .conditionJson("{\"timeWindow\": 1800}")
                    .weight(60)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build();

            Rule r5 = Rule.builder()
                    .id("RULE_05")
                    .name("Blacklisted Merchant")
                    .description("Triggers if merchant is flagged as high-risk/blacklisted")
                    .conditionJson("{\"merchants\": [\"mer_black_1\", \"mer_black_2\"]}")
                    .weight(80)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build();

            ruleRepository.saveAll(List.of(r1, r2, r3, r4, r5));
            log.info("Mock Rules Seeded.");
        }
    }
}
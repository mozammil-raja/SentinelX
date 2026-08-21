package com.sentinelx.backend.seeder;

import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.RuleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Automated database seeder that runs on application startup in development and test environments.
 * 
 * <p>Populates the local database with baseline mock users (with varied risk tiers),
 * trusted device fingerprints, and core production-ready fraud detection rules.
 * All seed operations are deterministic and check entity existence before saving.</p>
 */
@Slf4j
@Component
@Profile({"dev", "local", "test", "default"})
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
        if (!userRepository.existsById("usr_1001")) {
            userRepository.save(User.builder().id("usr_1001").email("alice@example.com").riskSegment("LOW").build());
        }
        if (!userRepository.existsById("usr_1002")) {
            userRepository.save(User.builder().id("usr_1002").email("bob@example.com").riskSegment("MEDIUM").build());
        }
        if (!userRepository.existsById("usr_1003")) {
            userRepository.save(User.builder().id("usr_1003").email("charlie@example.com").riskSegment("HIGH").build());
        }
        log.info("Mock Users Seeded.");
    }

    /**
     * Seeds initial trusted hardware device profiles for mock users Alice and Bob.
     */
    private void seedDevices() {
        if (!deviceRepository.existsById("dev_alice_phone")) {
            User alice = userRepository.findById("usr_1001").orElse(null);
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
        }

        if (!deviceRepository.existsById("dev_bob_laptop")) {
            User bob = userRepository.findById("usr_1002").orElse(null);
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
        }
        log.info("Mock Devices Seeded.");
    }

    /**
     * Seeds core baseline fraud detection rules:
     * 1. RULE_01: High Velocity (5m) (weight: 40)
     * 2. RULE_02: New Device (weight: 25)
     * 3. RULE_03: High-Value Transaction (weight: 50)
     * 4. RULE_04: Rapid IP Change (weight: 60)
     * 5. RULE_05: Blacklisted Merchant (weight: 80)
     * 6. RULE_06: User Risk Tier (weight: 30)
     */
    private void seedRules() {
        if (!ruleRepository.existsById("RULE_01")) {
            ruleRepository.save(Rule.builder()
                    .id("RULE_01")
                    .name("High Velocity (5m)")
                    .description("Triggers if user makes more than 5 transactions in 5 minutes")
                    .conditionJson("{\"window\": 300, \"limit\": 5}")
                    .weight(40)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build());
        }

        if (!ruleRepository.existsById("RULE_02")) {
            ruleRepository.save(Rule.builder()
                    .id("RULE_02")
                    .name("New Device")
                    .description("Triggers if the device footprint is unrecognized for this user")
                    .conditionJson("{\"trustedOnly\": true}")
                    .weight(25)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build());
        }

        if (!ruleRepository.existsById("RULE_03")) {
            ruleRepository.save(Rule.builder()
                    .id("RULE_03")
                    .name("High-Value Transaction")
                    .description("Triggers if transaction amount exceeds $10,000")
                    .conditionJson("{\"threshold\": 10000}")
                    .weight(50)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build());
        }

        if (!ruleRepository.existsById("RULE_04")) {
            ruleRepository.save(Rule.builder()
                    .id("RULE_04")
                    .name("Rapid IP Change")
                    .description("Triggers if transaction IP address differs from last seen IP within time window (rapid proxy/VPN hop)")
                    .conditionJson("{\"timeWindow\": 1800}")
                    .weight(60)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build());
        }

        if (!ruleRepository.existsById("RULE_05")) {
            ruleRepository.save(Rule.builder()
                    .id("RULE_05")
                    .name("Blacklisted Merchant")
                    .description("Triggers if merchant is flagged as high-risk/blacklisted")
                    .conditionJson("{\"merchants\": [\"mer_black_1\", \"mer_black_2\"]}")
                    .weight(80)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build());
        }

        if (!ruleRepository.existsById("RULE_06")) {
            ruleRepository.save(Rule.builder()
                    .id("RULE_06")
                    .name("User Risk Tier")
                    .description("Applies risk penalty for users in elevated risk segments (HIGH, CRITICAL)")
                    .conditionJson("{\"highWeight\": 30, \"criticalWeight\": 60}")
                    .weight(30)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build());
        }
        log.info("Mock Rules Seeded.");
    }
}
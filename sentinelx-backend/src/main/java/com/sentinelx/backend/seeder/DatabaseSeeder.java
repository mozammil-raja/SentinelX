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
     * Seeds mock user accounts representing distinct customer behavioral baselines (LOW, MEDIUM, HIGH, CRITICAL).
     */
    private void seedUsers() {
        if (!userRepository.existsById("usr_sarah")) {
            userRepository.save(User.builder()
                    .id("usr_sarah")
                    .name("Sarah Khan")
                    .email("sarah.khan@example.com")
                    .riskSegment("LOW")
                    .typicalSpendMin(new java.math.BigDecimal("500.00"))
                    .typicalSpendMax(new java.math.BigDecimal("3000.00"))
                    .currency("INR")
                    .usualLocation("Delhi, India")
                    .usualIpSubnet("103.21.244.")
                    .primaryDevice("iPhone 15 Pro")
                    .dailyTxnCount(3)
                    .occupation("Graphic Designer")
                    .build());
        }

        if (!userRepository.existsById("usr_arjun")) {
            userRepository.save(User.builder()
                    .id("usr_arjun")
                    .name("Arjun Mehta")
                    .email("arjun.mehta@example.com")
                    .riskSegment("MEDIUM")
                    .typicalSpendMin(new java.math.BigDecimal("2000.00"))
                    .typicalSpendMax(new java.math.BigDecimal("8000.00"))
                    .currency("INR")
                    .usualLocation("Mumbai, India")
                    .usualIpSubnet("103.55.120.")
                    .primaryDevice("Samsung Galaxy S24")
                    .dailyTxnCount(8)
                    .occupation("Sales Director")
                    .build());
        }

        if (!userRepository.existsById("usr_elena")) {
            userRepository.save(User.builder()
                    .id("usr_elena")
                    .name("Elena Rostova")
                    .email("elena.rostova@example.com")
                    .riskSegment("LOW")
                    .typicalSpendMin(new java.math.BigDecimal("1000.00"))
                    .typicalSpendMax(new java.math.BigDecimal("5000.00"))
                    .currency("INR")
                    .usualLocation("Bengaluru, India")
                    .usualIpSubnet("103.88.90.")
                    .primaryDevice("MacBook Pro M3")
                    .dailyTxnCount(4)
                    .occupation("Software Engineer")
                    .build());
        }

        if (!userRepository.existsById("usr_david")) {
            userRepository.save(User.builder()
                    .id("usr_david")
                    .name("David Chen")
                    .email("david.chen@example.com")
                    .riskSegment("HIGH")
                    .typicalSpendMin(new java.math.BigDecimal("500.00"))
                    .typicalSpendMax(new java.math.BigDecimal("2500.00"))
                    .currency("INR")
                    .usualLocation("Hyderabad, India")
                    .usualIpSubnet("103.44.70.")
                    .primaryDevice("Windows 11 PC")
                    .dailyTxnCount(12)
                    .occupation("Freelancer (High Dispute Rate)")
                    .build());
        }

        if (!userRepository.existsById("usr_1001")) {
            userRepository.save(User.builder()
                    .id("usr_1001")
                    .name("Alice Smith")
                    .email("alice@example.com")
                    .riskSegment("LOW")
                    .typicalSpendMin(new java.math.BigDecimal("10.00"))
                    .typicalSpendMax(new java.math.BigDecimal("100.00"))
                    .currency("USD")
                    .usualLocation("New York, USA")
                    .usualIpSubnet("198.51.100.")
                    .primaryDevice("iPhone 15")
                    .dailyTxnCount(3)
                    .occupation("Product Manager")
                    .build());
        }
        if (!userRepository.existsById("usr_1002")) {
            userRepository.save(User.builder()
                    .id("usr_1002")
                    .name("Bob Johnson")
                    .email("bob@example.com")
                    .riskSegment("MEDIUM")
                    .typicalSpendMin(new java.math.BigDecimal("50.00"))
                    .typicalSpendMax(new java.math.BigDecimal("500.00"))
                    .currency("USD")
                    .usualLocation("San Francisco, USA")
                    .usualIpSubnet("198.51.100.")
                    .primaryDevice("MacBook Pro")
                    .dailyTxnCount(5)
                    .occupation("Architect")
                    .build());
        }
        if (!userRepository.existsById("usr_1003")) {
            userRepository.save(User.builder()
                    .id("usr_1003")
                    .name("Charlie Davis")
                    .email("charlie@example.com")
                    .riskSegment("HIGH")
                    .typicalSpendMin(new java.math.BigDecimal("20.00"))
                    .typicalSpendMax(new java.math.BigDecimal("150.00"))
                    .currency("USD")
                    .usualLocation("Chicago, USA")
                    .usualIpSubnet("198.51.100.")
                    .primaryDevice("Android Phone")
                    .dailyTxnCount(10)
                    .occupation("Elevated Risk Tier User")
                    .build());
        }
        if (!userRepository.existsById("usr_burst_demo")) {
            userRepository.save(User.builder()
                    .id("usr_burst_demo")
                    .name("Bot Spammer (Velocity Demo)")
                    .email("bot_spammer@attacker.com")
                    .riskSegment("CRITICAL")
                    .typicalSpendMin(new java.math.BigDecimal("5.00"))
                    .typicalSpendMax(new java.math.BigDecimal("20.00"))
                    .currency("USD")
                    .usualLocation("Unknown / Proxy")
                    .usualIpSubnet("203.0.113.")
                    .primaryDevice("Headless Linux VM")
                    .dailyTxnCount(50)
                    .occupation("Automated Script Bot")
                    .build());
        }
        log.info("Mock Users Seeded.");
    }

    /**
     * Seeds initial trusted hardware device profiles for mock users.
     */
    private void seedDevices() {
        seedSingleDevice("dev_sarah_phone", "usr_sarah", "fp_sarah_iphone15_sha256", "103.21.244.10", "iOS", "Safari", true);
        seedSingleDevice("dev_arjun_phone", "usr_arjun", "fp_arjun_galaxy_s24_sha256", "103.55.120.45", "Android", "Chrome", true);
        seedSingleDevice("dev_elena_mac", "usr_elena", "fp_elena_macbook_sha256", "103.88.90.12", "macOS", "Safari", true);
        seedSingleDevice("dev_david_pc", "usr_david", "fp_david_windows_pc", "103.44.70.80", "Windows", "Chrome", true);
        seedSingleDevice("dev_alice_phone", "usr_1001", "fp_alice_iphone15_sha256", "198.51.100.10", "iOS", "Safari", true);
        seedSingleDevice("dev_bob_laptop", "usr_1002", "fp_bob_macbook_sha256", "198.51.100.20", "macOS", "Chrome", true);
        seedSingleDevice("dev_bot_vm", "usr_burst_demo", "fp_bot_vm_instance_9", "203.0.113.88", "Linux", "HeadlessChrome", false);
        log.info("Mock Devices Seeded.");
    }

    private void seedSingleDevice(String deviceId, String userId, String fingerprint, String ip, String os, String browser, boolean trusted) {
        if (!deviceRepository.existsById(deviceId)) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                Device dev = Device.builder()
                        .id(deviceId)
                        .user(user)
                        .fingerprint(fingerprint)
                        .ipAddress(ip)
                        .os(os)
                        .browser(browser)
                        .isTrusted(trusted)
                        .build();
                deviceRepository.save(dev);
            }
        }
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

        if (!ruleRepository.existsById("RULE_07")) {
            ruleRepository.save(Rule.builder()
                    .id("RULE_07")
                    .name("Syndicate Fraud Ring")
                    .description("Graph analysis: Triggers if account shares hardware devices, IPs, or cards with blocked fraudsters")
                    .conditionJson("{\"maxHops\": 2, \"inspectDevices\": true, \"inspectIps\": true}")
                    .weight(75)
                    .version(1)
                    .isActive(true)
                    .createdBy("system")
                    .build());
        }
        log.info("Mock Rules Seeded.");
    }
}
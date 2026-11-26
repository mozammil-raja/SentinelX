package com.sentinelx.backend.seeder;

import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.Decision;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.RuleRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.repository.DecisionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/**
 * Automated database seeder that populates the SentinelX platform with:
 * 1. 5 distinct real-world customer personas representing diverse risk baselines.
 * 2. 1,000 realistic historical transactions and audit decisions spread across the past 35 days.
 * 3. Registered trusted device hardware fingerprints.
 * 4. Core production-ready fraud detection rules (RULE_01 to RULE_07).
 */
@Slf4j
@Component
@Profile({"dev", "local", "test", "default"})
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final RuleRepository ruleRepository;
    private final TransactionRepository transactionRepository;
    private final DecisionRepository decisionRepository;

    public DatabaseSeeder(UserRepository userRepository, 
                          DeviceRepository deviceRepository, 
                          RuleRepository ruleRepository,
                          TransactionRepository transactionRepository,
                          DecisionRepository decisionRepository) {
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.ruleRepository = ruleRepository;
        this.transactionRepository = transactionRepository;
        this.decisionRepository = decisionRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        seedUsers();
        seedDevices();
        seedRules();
        seedHistoricalTransactions();
        log.info("--- SentinelX Database Seeding Completed Successfully ---");
    }

    /**
     * Seeds 5 distinct customer personas establishing real-world spending baselines and risk tiers.
     */
    private void seedUsers() {
        // Persona 1: Alice Chen — College Student (Low Risk)
        upsertUser(User.builder()
                .id("usr_alice")
                .name("Alice Chen")
                .email("alice.chen@austin.edu")
                .riskSegment("LOW")
                .typicalSpendMin(new BigDecimal("5.00"))
                .typicalSpendMax(new BigDecimal("45.00"))
                .currency("USD")
                .usualLocation("Austin, Texas, USA")
                .usualIpSubnet("198.51.100.")
                .primaryDevice("Apple iPhone 14")
                .dailyTxnCount(4)
                .occupation("Computer Science Student")
                .build());

        // Persona 2: Arjun Mehta — Corporate VP (Medium Risk / High Volume)
        upsertUser(User.builder()
                .id("usr_arjun")
                .name("Arjun Mehta")
                .email("arjun.mehta@enterprise.com")
                .riskSegment("MEDIUM")
                .typicalSpendMin(new BigDecimal("15000.00"))
                .typicalSpendMax(new BigDecimal("180000.00"))
                .currency("INR")
                .usualLocation("Mumbai, India")
                .usualIpSubnet("103.55.120.")
                .primaryDevice("Samsung Galaxy S24")
                .dailyTxnCount(7)
                .occupation("VP of Enterprise Sales")
                .build());

        // Persona 3: Sarah Jenkins — Freelance UI/UX Designer (Low Risk)
        upsertUser(User.builder()
                .id("usr_sarah")
                .name("Sarah Jenkins")
                .email("sarah.jenkins@designstudio.uk")
                .riskSegment("LOW")
                .typicalSpendMin(new BigDecimal("25.00"))
                .typicalSpendMax(new BigDecimal("220.00"))
                .currency("GBP")
                .usualLocation("London, United Kingdom")
                .usualIpSubnet("82.165.197.")
                .primaryDevice("Apple MacBook Pro M3")
                .dailyTxnCount(5)
                .occupation("Freelance Lead Designer")
                .build());

        // Persona 4: David Vance — High-Risk Algorithmic Trader (High Risk Tier)
        upsertUser(User.builder()
                .id("usr_david")
                .name("David Vance")
                .email("david.vance@cryptohedge.sg")
                .riskSegment("HIGH")
                .typicalSpendMin(new BigDecimal("100.00"))
                .typicalSpendMax(new BigDecimal("1200.00"))
                .currency("USD")
                .usualLocation("Singapore")
                .usualIpSubnet("165.22.100.")
                .primaryDevice("Custom Gaming PC")
                .dailyTxnCount(12)
                .occupation("Crypto Trader (Prior Disputes)")
                .build());

        // Persona 5: Viktor "Ghost" Kazlov — Syndicate Cashout Mule (Critical Risk)
        upsertUser(User.builder()
                .id("usr_viktor")
                .name("Viktor \"Ghost\" Kazlov")
                .email("viktor.kazlov@protonmail.ch")
                .riskSegment("CRITICAL")
                .typicalSpendMin(new BigDecimal("20.00"))
                .typicalSpendMax(new BigDecimal("90.00"))
                .currency("USD")
                .usualLocation("Unknown / Residential Proxy")
                .usualIpSubnet("194.26.29.")
                .primaryDevice("Burner Android Tablet")
                .dailyTxnCount(10)
                .occupation("Syndicate Cashout Mule")
                .build());

        // Known Banned Fraudster Node for Graph BFS Collusion (RULE_07)
        upsertUser(User.builder()
                .id("usr_syndicate_banned_99")
                .name("Banned Fraudster Account #99")
                .email("scam_king@darknet.onion")
                .riskSegment("CRITICAL")
                .typicalSpendMin(new BigDecimal("10.00"))
                .typicalSpendMax(new BigDecimal("50.00"))
                .currency("USD")
                .usualLocation("Blacklisted Subnet")
                .usualIpSubnet("203.0.113.")
                .primaryDevice("Burner Android Tablet")
                .dailyTxnCount(50)
                .occupation("Flagged Syndicate Ring Leader")
                .build());

        // Legacy Test Accounts for integration tests
        upsertUser(User.builder()
                .id("usr_1001")
                .name("Alice Smith")
                .email("alice@example.com")
                .riskSegment("LOW")
                .typicalSpendMin(new BigDecimal("10.00"))
                .typicalSpendMax(new BigDecimal("100.00"))
                .currency("USD")
                .usualLocation("New York, USA")
                .usualIpSubnet("198.51.100.")
                .primaryDevice("iPhone 15")
                .dailyTxnCount(3)
                .occupation("Product Manager")
                .build());

        log.info("5 Primary Personas and Support Users Seeded.");
    }

    private void upsertUser(User user) {
        if (!userRepository.existsById(user.getId())) {
            userRepository.save(user);
        } else {
            // Update baseline spending fields if existing
            userRepository.findById(user.getId()).ifPresent(existing -> {
                existing.setName(user.getName());
                existing.setEmail(user.getEmail());
                existing.setRiskSegment(user.getRiskSegment());
                existing.setTypicalSpendMin(user.getTypicalSpendMin());
                existing.setTypicalSpendMax(user.getTypicalSpendMax());
                existing.setCurrency(user.getCurrency());
                existing.setUsualLocation(user.getUsualLocation());
                existing.setUsualIpSubnet(user.getUsualIpSubnet());
                existing.setPrimaryDevice(user.getPrimaryDevice());
                existing.setOccupation(user.getOccupation());
                userRepository.save(existing);
            });
        }
    }

    /**
     * Seeds trusted hardware device profiles for mock users.
     */
    private void seedDevices() {
        seedSingleDevice("dev_alice_phone", "usr_alice", "fp_alice_iphone14_sha256", "198.51.100.15", "iOS", "Safari", true);
        seedSingleDevice("dev_arjun_phone", "usr_arjun", "fp_arjun_galaxy_s24_sha256", "103.55.120.45", "Android", "Chrome", true);
        seedSingleDevice("dev_arjun_laptop", "usr_arjun", "fp_arjun_thinkpad_sha256", "103.55.120.48", "Windows", "Edge", true);
        seedSingleDevice("dev_sarah_mac", "usr_sarah", "fp_sarah_macbook_sha256", "82.165.197.10", "macOS", "Safari", true);
        seedSingleDevice("dev_sarah_phone", "usr_sarah", "fp_sarah_iphone15_sha256", "82.165.197.12", "iOS", "Safari", true);
        seedSingleDevice("dev_david_pc", "usr_david", "fp_david_gaming_pc", "165.22.100.80", "Windows", "Chrome", true);
        seedSingleDevice("dev_viktor_tablet", "usr_viktor", "fp_shared_syndicate_ipad", "194.26.29.40", "Android", "Firefox", true);
        seedSingleDevice("dev_banned_tablet", "usr_syndicate_banned_99", "fp_shared_syndicate_ipad", "203.0.113.88", "Android", "Firefox", false);
        log.info("Trusted Devices Seeded.");
    }

    private void seedSingleDevice(String deviceId, String userId, String fingerprint, String ip, String os, String browser, boolean trusted) {
        Device existing = deviceRepository.findByUserIdAndFingerprint(userId, fingerprint).orElse(null);
        if (existing != null) {
            existing.setIsTrusted(trusted);
            deviceRepository.save(existing);
            return;
        }

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
     * Seeds core baseline fraud detection rules (RULE_01 to RULE_07).
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
                    .description("Triggers if transaction amount exceeds $10,000 or deviates significantly from typical spend")
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
        log.info("Core Rules RULE_01 to RULE_07 Seeded.");
    }

    /**
     * Seeds 1,000 realistic historical transactions and decision records across the 5 personas.
     */
    private void seedHistoricalTransactions() {
        long currentCount = transactionRepository.count();
        if (currentCount >= 1000) {
            log.info("Database already contains {} historical transactions. Skipping seed.", currentCount);
            return;
        }

        log.info("Seeding 1,000 realistic historical transactions across the 5 personas...");

        User alice = userRepository.findById("usr_alice").orElse(null);
        User arjun = userRepository.findById("usr_arjun").orElse(null);
        User sarah = userRepository.findById("usr_sarah").orElse(null);
        User david = userRepository.findById("usr_david").orElse(null);
        User viktor = userRepository.findById("usr_viktor").orElse(null);

        if (alice == null || arjun == null || sarah == null || david == null || viktor == null) {
            log.warn("One or more personas missing. Aborting historical seeding.");
            return;
        }

        Device aliceDevice = deviceRepository.findById("dev_alice_phone").orElse(null);
        Device arjunDevice = deviceRepository.findById("dev_arjun_phone").orElse(null);
        Device sarahDevice = deviceRepository.findById("dev_sarah_mac").orElse(null);
        Device davidDevice = deviceRepository.findById("dev_david_pc").orElse(null);
        Device viktorDevice = deviceRepository.findById("dev_viktor_tablet").orElse(null);

        List<Transaction> transactionsToSave = new ArrayList<>(1000);
        List<Decision> decisionsToSave = new ArrayList<>(1000);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        // 1. Alice Chen: 200 Transactions (Micro-spends, USD, Campus & Cafe)
        String[] aliceMerchants = {"mer_coffee_beans", "mer_campus_books", "mer_uber_rides", "mer_spotify_sub", "mer_grocery_fresh"};
        for (int i = 1; i <= 200; i++) {
            BigDecimal amt = new BigDecimal(5.00 + ((i * 1.73) % 38.0)).setScale(2, RoundingMode.HALF_UP);
            String merchant = aliceMerchants[i % aliceMerchants.length];
            OffsetDateTime timestamp = now.minusHours((200 - i) * 4L + (i % 3));
            String txnId = String.format("txn_hist_alice_%03d", i);

            Transaction txn = Transaction.builder()
                    .id(txnId)
                    .user(alice)
                    .amount(amt)
                    .currency("USD")
                    .merchantId(merchant)
                    .cardBin("411111")
                    .ipAddress("198.51.100.15")
                    .device(aliceDevice)
                    .status("APPROVED")
                    .timestamp(timestamp)
                    .build();
            transactionsToSave.add(txn);

            Decision dec = Decision.builder()
                    .id(String.format("dec_hist_alice_%03d", i))
                    .transactionId(txnId)
                    .user(alice)
                    .finalScore(i % 15)
                    .decision("ALLOW")
                    .firedRules("[]")
                    .evaluationTimeMs(5 + (i % 7))
                    .build();
            decisionsToSave.add(dec);
        }

        // 2. Arjun Mehta: 250 Transactions (Corporate High-Spend, INR, Airlines, 5-Star Hotels)
        String[] arjunMerchants = {"mer_indigo_airlines", "mer_taj_hotels", "mer_fine_dining", "mer_aws_cloud", "mer_apple_store"};
        for (int i = 1; i <= 250; i++) {
            BigDecimal amt = new BigDecimal(15000.00 + ((i * 573.0) % 135000.0)).setScale(2, RoundingMode.HALF_UP);
            String merchant = arjunMerchants[i % arjunMerchants.length];
            OffsetDateTime timestamp = now.minusHours((250 - i) * 3L + (i % 2));
            String txnId = String.format("txn_hist_arjun_%03d", i);

            Transaction txn = Transaction.builder()
                    .id(txnId)
                    .user(arjun)
                    .amount(amt)
                    .currency("INR")
                    .merchantId(merchant)
                    .cardBin("520000")
                    .ipAddress("103.55.120.45")
                    .device(arjunDevice)
                    .status("APPROVED")
                    .timestamp(timestamp)
                    .build();
            transactionsToSave.add(txn);

            Decision dec = Decision.builder()
                    .id(String.format("dec_hist_arjun_%03d", i))
                    .transactionId(txnId)
                    .user(arjun)
                    .finalScore(10 + (i % 12))
                    .decision("ALLOW")
                    .firedRules("[]")
                    .evaluationTimeMs(6 + (i % 6))
                    .build();
            decisionsToSave.add(dec);
        }

        // 3. Sarah Jenkins: 220 Transactions (Design Subscriptions & Coworking, GBP, London)
        String[] sarahMerchants = {"mer_pret_manger", "mer_wework_spaces", "mer_tesco_market", "mer_figma_software", "mer_trainline_uk"};
        for (int i = 1; i <= 220; i++) {
            BigDecimal amt = new BigDecimal(25.00 + ((i * 2.87) % 185.0)).setScale(2, RoundingMode.HALF_UP);
            String merchant = sarahMerchants[i % sarahMerchants.length];
            OffsetDateTime timestamp = now.minusHours((220 - i) * 3L + (i % 4));
            String txnId = String.format("txn_hist_sarah_%03d", i);

            Transaction txn = Transaction.builder()
                    .id(txnId)
                    .user(sarah)
                    .amount(amt)
                    .currency("GBP")
                    .merchantId(merchant)
                    .cardBin("450000")
                    .ipAddress("82.165.197.10")
                    .device(sarahDevice)
                    .status("APPROVED")
                    .timestamp(timestamp)
                    .build();
            transactionsToSave.add(txn);

            Decision dec = Decision.builder()
                    .id(String.format("dec_hist_sarah_%03d", i))
                    .transactionId(txnId)
                    .user(sarah)
                    .finalScore(i % 10)
                    .decision("ALLOW")
                    .firedRules("[]")
                    .evaluationTimeMs(5 + (i % 5))
                    .build();
            decisionsToSave.add(dec);
        }

        // 4. David Vance: 180 Transactions (Volatile Crypto / Gaming, USD, High Risk Segment)
        String[] davidMerchants = {"mer_binance_pay", "mer_steam_games", "mer_electronics_store", "mer_luxury_watches"};
        for (int i = 1; i <= 180; i++) {
            BigDecimal amt = new BigDecimal(90.00 + ((i * 7.31) % 950.0)).setScale(2, RoundingMode.HALF_UP);
            String merchant = davidMerchants[i % davidMerchants.length];
            OffsetDateTime timestamp = now.minusHours((180 - i) * 4L);
            String txnId = String.format("txn_hist_david_%03d", i);

            // 15% Review, 5% Block to reflect his volatile risk history
            String status = (i % 20 == 0) ? "BLOCKED" : (i % 7 == 0) ? "REVIEW" : "APPROVED";
            String decisionVerdict = "BLOCKED".equals(status) ? "BLOCK" : "REVIEW".equals(status) ? "REVIEW" : "ALLOW";
            int score = "BLOCK".equals(decisionVerdict) ? 78 : "REVIEW".equals(decisionVerdict) ? 48 : 30;

            Transaction txn = Transaction.builder()
                    .id(txnId)
                    .user(david)
                    .amount(amt)
                    .currency("USD")
                    .merchantId(merchant)
                    .cardBin("424242")
                    .ipAddress("165.22.100.80")
                    .device(davidDevice)
                    .status(status)
                    .timestamp(timestamp)
                    .build();
            transactionsToSave.add(txn);

            Decision dec = Decision.builder()
                    .id(String.format("dec_hist_david_%03d", i))
                    .transactionId(txnId)
                    .user(david)
                    .finalScore(score)
                    .decision(decisionVerdict)
                    .firedRules("[\"RULE_06: User Risk Tier: Elevated baseline risk tier (+30 pts)\"]")
                    .evaluationTimeMs(6 + (i % 8))
                    .build();
            decisionsToSave.add(dec);
        }

        // 5. Viktor "Ghost": 150 Transactions (Small retail mule charges, USD)
        String[] viktorMerchants = {"mer_grocery_fresh", "mer_digital_goods", "mer_gas_station"};
        for (int i = 1; i <= 150; i++) {
            BigDecimal amt = new BigDecimal(18.00 + ((i * 1.43) % 68.0)).setScale(2, RoundingMode.HALF_UP);
            String merchant = viktorMerchants[i % viktorMerchants.length];
            OffsetDateTime timestamp = now.minusHours((150 - i) * 4L);
            String txnId = String.format("txn_hist_viktor_%03d", i);

            Transaction txn = Transaction.builder()
                    .id(txnId)
                    .user(viktor)
                    .amount(amt)
                    .currency("USD")
                    .merchantId(merchant)
                    .cardBin("540000")
                    .ipAddress("194.26.29.40")
                    .device(viktorDevice)
                    .status("APPROVED")
                    .timestamp(timestamp)
                    .build();
            transactionsToSave.add(txn);

            Decision dec = Decision.builder()
                    .id(String.format("dec_hist_viktor_%03d", i))
                    .transactionId(txnId)
                    .user(viktor)
                    .finalScore(15 + (i % 12))
                    .decision("ALLOW")
                    .firedRules("[]")
                    .evaluationTimeMs(5 + (i % 6))
                    .build();
            decisionsToSave.add(dec);
        }

        transactionRepository.saveAll(transactionsToSave);
        decisionRepository.saveAll(decisionsToSave);

        log.info("Successfully seeded {} historical transactions and decisions (Alice: 200, Arjun: 250, Sarah: 220, David: 180, Viktor: 150).",
                transactionsToSave.size());
    }
}

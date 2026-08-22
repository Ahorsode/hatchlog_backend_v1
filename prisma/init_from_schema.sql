-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "HealthEventType" AS ENUM ('SICK', 'DEAD');

-- CreateEnum
CREATE TYPE "LivestockType" AS ENUM ('POULTRY_BROILER', 'POULTRY_LAYER', 'CATTLE', 'SHEEP_GOAT', 'PIG', 'OTHER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER', 'CASHIER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FEED', 'MEDICATION', 'EQUIPMENT', 'UTILITIES', 'SALARY', 'MAINTENANCE', 'OTHER', 'LIVESTOCK_PURCHASE', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "FeedType" AS ENUM ('PRE_STARTER', 'STARTER', 'GROWER', 'FINISHER', 'BREEDER', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstname" TEXT,
    "surname" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "phone_number" TEXT,
    "middle_name" TEXT,
    "password" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "security_notice" TEXT,
    "security_revoked_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "device_type" TEXT,
    "farm_id" TEXT,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'BASIC',
    "master_license_status" TEXT DEFAULT 'NO_TRIAL',
    "trial_started_at" TIMESTAMP(3),
    "trial_expires_at" TIMESTAMP(3),
    "trial_exhausted_at" TIMESTAMP(3),

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "houses" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentTemperature" DECIMAL(5,2),
    "currentHumidity" DECIMAL(5,2),
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isIsolation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "breedType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentCount" INTEGER NOT NULL,
    "houseId" TEXT NOT NULL,
    "initialCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',
    "batchName" TEXT NOT NULL DEFAULT 'New Batch',
    "carriage_inward" DECIMAL(15,2),
    "growthTargetOverride" TEXT,
    "growth_target" TEXT,
    "initialCostActual" DECIMAL(15,2),
    "initialCostCarriage" DECIMAL(15,2),
    "initialCostOther" JSONB,
    "initial_actual_cost" DECIMAL(15,2),
    "initial_other_costs" JSONB,
    "isolationCount" INTEGER NOT NULL DEFAULT 0,
    "type" "LivestockType" NOT NULL DEFAULT 'POULTRY_BROILER',
    "local_batch_id" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "stockLevel" DECIMAL(15,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',
    "reorderLevel" DECIMAL(15,2) DEFAULT 500.00,
    "costPerUnit" DECIMAL(15,2),
    "usageType" TEXT,
    "eggCategoryId" TEXT,
    "supplierId" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insert_logs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "inserted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delete_logs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "deleted_data_csv" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "delete_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_feeding_logs" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT,
    "feed_type_id" TEXT,
    "amount_consumed" DECIMAL(15,2) NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',
    "formulation_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "daily_feeding_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT,
    "record_type" VARCHAR(50),
    "description" TEXT,
    "record_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egg_production" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eggsCollected" INTEGER NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',
    "categoryId" TEXT,
    "cratesCollected" DECIMAL(15,2),
    "eggsRemaining" INTEGER NOT NULL DEFAULT 0,
    "qualityGrade" TEXT,
    "unusableCount" INTEGER NOT NULL DEFAULT 0,
    "isSorted" BOOLEAN NOT NULL DEFAULT false,
    "largeCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "smallCount" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "egg_production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isolation_rooms" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "isolation_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortality" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reason" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',
    "sub_category" TEXT,
    "isolation_room_id" TEXT,
    "type" "HealthEventType" NOT NULL DEFAULT 'DEAD',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mortality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "averageWeight" DECIMAL(10,3) NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "customerName" TEXT,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "userId" TEXT NOT NULL DEFAULT 'user_placeholder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_members" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farm_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_schedules" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "quantity" DECIMAL(15,2),
    "usageType" TEXT,
    "unit" TEXT,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',

    CONSTRAINT "vaccination_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_schedules" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "quantity" DECIMAL(15,2),
    "usageType" TEXT,
    "unit" TEXT,
    "farmId" TEXT NOT NULL DEFAULT 'farm_placeholder',

    CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_settings" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "eggRecordReminderTime" TEXT DEFAULT '18:00',
    "feedRecordReminderTime" TEXT DEFAULT '18:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "growth_target_standard" INTEGER,
    "eggsPerCrate" INTEGER NOT NULL DEFAULT 30,
    "default_egg_unit" TEXT NOT NULL DEFAULT 'crate',
    "allow_egg_unit_change" BOOLEAN NOT NULL DEFAULT false,
    "default_egg_sort_mode" TEXT NOT NULL DEFAULT 'unsorted',
    "allow_egg_sort_mode_change" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "farm_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_settings" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "allow_batch_override" BOOLEAN NOT NULL DEFAULT false,
    "allow_worker_discounts" BOOLEAN NOT NULL DEFAULT false,
    "default_discount_type" TEXT NOT NULL DEFAULT 'item',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "attribute_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "reason" TEXT,
    "user_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action_type" TEXT,
    "description" TEXT,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT,
    "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "batch_id" TEXT,
    "supplierId" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_allocations" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "allocated_amount" DECIMAL(15,2) NOT NULL,
    "allocation_percentage" DECIMAL(7,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "can_view_finance" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_finance" BOOLEAN NOT NULL DEFAULT false,
    "can_view_inventory" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_inventory" BOOLEAN NOT NULL DEFAULT false,
    "can_view_batches" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_batches" BOOLEAN NOT NULL DEFAULT false,
    "can_view_sales" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_sales" BOOLEAN NOT NULL DEFAULT false,
    "can_view_eggs" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_eggs" BOOLEAN NOT NULL DEFAULT false,
    "can_view_feeding" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_feeding" BOOLEAN NOT NULL DEFAULT false,
    "can_view_houses" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_houses" BOOLEAN NOT NULL DEFAULT false,
    "can_view_mortality" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_mortality" BOOLEAN NOT NULL DEFAULT false,
    "can_view_health" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_health" BOOLEAN NOT NULL DEFAULT false,
    "can_view_customers" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_customers" BOOLEAN NOT NULL DEFAULT false,
    "can_view_team" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_team" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_standards" (
    "id" TEXT NOT NULL,
    "livestockType" "LivestockType" NOT NULL,
    "ageInDays" INTEGER NOT NULL,
    "targetWeight" DECIMAL(10,3) NOT NULL,
    "targetFeed" DECIMAL(10,3),
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balanceOwed" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoice_number" INTEGER DEFAULT nextval('order_invoice_number_seq'::regclass),
    "subtotal_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "payment_account_name" TEXT,
    "cash_received" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL DEFAULT 'user_placeholder',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "inventoryId" TEXT,
    "livestockId" TEXT,
    "egg_allocation_mode" TEXT,
    "egg_batch_id" TEXT,
    "line_discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_discount_type" TEXT NOT NULL DEFAULT 'flat',

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_batch_allocations" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "eggs_used" INTEGER NOT NULL,
    "revenue_amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_batch_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_formulations" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "targetLivestock" "LivestockType",
    "type" "FeedType" NOT NULL,
    "stockLevel" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "feed_formulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_formulation_ingredients" (
    "id" TEXT NOT NULL,
    "formulationId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "feed_formulation_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balanceOwed" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egg_categories" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStockInternal" BOOLEAN NOT NULL DEFAULT true,
    "sellingPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unitSize" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "egg_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farm_id" TEXT NOT NULL,
    "user_id" TEXT,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "licenseKey" TEXT,
    "activation_key_status" TEXT NOT NULL DEFAULT 'UNUSED',
    "license_status" TEXT NOT NULL DEFAULT 'CLOUD_TRIAL',
    "hardware_id" TEXT,
    "license_expires_at" TIMESTAMP(3),
    "grace_rescue_used_at" TIMESTAMP(3),
    "lastActivationToken" TEXT,
    "lastPaymentAt" TIMESTAMP(3),
    "activatedByAdminId" TEXT,

    CONSTRAINT "device_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_license_renewal_log" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "device_registration_id" UUID NOT NULL,
    "hardware_id" TEXT NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "previous_license_status" TEXT,
    "new_license_status" TEXT NOT NULL,
    "previous_expires_at" TIMESTAMP(3),
    "new_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_license_renewal_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_license_payments" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "device_registration_id" UUID NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "hardware_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "duration_days" INTEGER NOT NULL,
    "target_expiry_date" TIMESTAMP(3) NOT NULL,
    "payment_mode_note" TEXT NOT NULL,
    "activation_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_license_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "farm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issued_licenses" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "account_user_id" TEXT,
    "hardware_id" TEXT NOT NULL,
    "desktop_farm_id" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "target_expiry_date" TIMESTAMP(3) NOT NULL,
    "activation_token" TEXT NOT NULL,
    "transaction_reference" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issued_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "customer_id" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "deposit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstanding_credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_num" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_username_key" ON "admin_user"("username");

-- CreateIndex
CREATE INDEX "farms_userId_idx" ON "farms"("userId");

-- CreateIndex
CREATE INDEX "houses_userId_idx" ON "houses"("userId");

-- CreateIndex
CREATE INDEX "houses_farmId_idx" ON "houses"("farmId");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE INDEX "batches_type_idx" ON "batches"("type");

-- CreateIndex
CREATE INDEX "batches_userId_idx" ON "batches"("userId");

-- CreateIndex
CREATE INDEX "batches_farmId_idx" ON "batches"("farmId");

-- CreateIndex
CREATE INDEX "batches_houseId_idx" ON "batches"("houseId");

-- CreateIndex
CREATE INDEX "batches_farmId_is_deleted_idx" ON "batches"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "batches_farmId_deleted_at_idx" ON "batches"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "inventory_userId_idx" ON "inventory"("userId");

-- CreateIndex
CREATE INDEX "inventory_farmId_idx" ON "inventory"("farmId");

-- CreateIndex
CREATE INDEX "inventory_eggCategoryId_idx" ON "inventory"("eggCategoryId");

-- CreateIndex
CREATE INDEX "inventory_supplierId_idx" ON "inventory"("supplierId");

-- CreateIndex
CREATE INDEX "inventory_farmId_is_deleted_idx" ON "inventory"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "inventory_farmId_deleted_at_idx" ON "inventory"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "insert_logs_farm_id_idx" ON "insert_logs"("farm_id");

-- CreateIndex
CREATE INDEX "insert_logs_user_id_idx" ON "insert_logs"("user_id");

-- CreateIndex
CREATE INDEX "delete_logs_farm_id_idx" ON "delete_logs"("farm_id");

-- CreateIndex
CREATE INDEX "delete_logs_user_id_idx" ON "delete_logs"("user_id");

-- CreateIndex
CREATE INDEX "daily_feeding_logs_batch_id_log_date_idx" ON "daily_feeding_logs"("batch_id", "log_date");

-- CreateIndex
CREATE INDEX "daily_feeding_logs_user_id_idx" ON "daily_feeding_logs"("user_id");

-- CreateIndex
CREATE INDEX "daily_feeding_logs_farmId_idx" ON "daily_feeding_logs"("farmId");

-- CreateIndex
CREATE INDEX "daily_feeding_logs_feed_type_id_idx" ON "daily_feeding_logs"("feed_type_id");

-- CreateIndex
CREATE INDEX "daily_feeding_logs_formulation_id_idx" ON "daily_feeding_logs"("formulation_id");

-- CreateIndex
CREATE INDEX "daily_feeding_logs_farmId_is_deleted_idx" ON "daily_feeding_logs"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "daily_feeding_logs_farmId_deleted_at_idx" ON "daily_feeding_logs"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "health_records_farmId_idx" ON "health_records"("farmId");

-- CreateIndex
CREATE INDEX "health_records_batch_id_idx" ON "health_records"("batch_id");

-- CreateIndex
CREATE INDEX "egg_production_batchId_logDate_idx" ON "egg_production"("batchId", "logDate");

-- CreateIndex
CREATE INDEX "egg_production_userId_idx" ON "egg_production"("userId");

-- CreateIndex
CREATE INDEX "egg_production_farmId_idx" ON "egg_production"("farmId");

-- CreateIndex
CREATE INDEX "egg_production_categoryId_idx" ON "egg_production"("categoryId");

-- CreateIndex
CREATE INDEX "egg_production_farmId_is_deleted_idx" ON "egg_production"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "egg_production_farmId_deleted_at_idx" ON "egg_production"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "isolation_rooms_farmId_idx" ON "isolation_rooms"("farmId");

-- CreateIndex
CREATE INDEX "isolation_rooms_userId_idx" ON "isolation_rooms"("userId");

-- CreateIndex
CREATE INDEX "mortality_batchId_logDate_idx" ON "mortality"("batchId", "logDate");

-- CreateIndex
CREATE INDEX "mortality_userId_idx" ON "mortality"("userId");

-- CreateIndex
CREATE INDEX "mortality_farmId_idx" ON "mortality"("farmId");

-- CreateIndex
CREATE INDEX "mortality_isolation_room_id_idx" ON "mortality"("isolation_room_id");

-- CreateIndex
CREATE INDEX "mortality_farmId_is_deleted_idx" ON "mortality"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "mortality_farmId_deleted_at_idx" ON "mortality"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "weight_records_userId_idx" ON "weight_records"("userId");

-- CreateIndex
CREATE INDEX "weight_records_farmId_idx" ON "weight_records"("farmId");

-- CreateIndex
CREATE INDEX "weight_records_batchId_idx" ON "weight_records"("batchId");

-- CreateIndex
CREATE INDEX "sales_saleDate_status_idx" ON "sales"("saleDate", "status");

-- CreateIndex
CREATE INDEX "sales_userId_idx" ON "sales"("userId");

-- CreateIndex
CREATE INDEX "sales_farmId_idx" ON "sales"("farmId");

-- CreateIndex
CREATE INDEX "sales_farmId_is_deleted_idx" ON "sales"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "sales_farmId_deleted_at_idx" ON "sales"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "sale_items_farmId_idx" ON "sale_items"("farmId");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "farm_members_farmId_idx" ON "farm_members"("farmId");

-- CreateIndex
CREATE INDEX "farm_members_userId_idx" ON "farm_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_members_farmId_userId_key" ON "farm_members"("farmId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_phone_number_key" ON "invitations"("phone_number");

-- CreateIndex
CREATE INDEX "invitations_farm_id_idx" ON "invitations"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_email_farm_id_key" ON "invitations"("email", "farm_id");

-- CreateIndex
CREATE INDEX "vaccination_schedules_batchId_idx" ON "vaccination_schedules"("batchId");

-- CreateIndex
CREATE INDEX "vaccination_schedules_farmId_idx" ON "vaccination_schedules"("farmId");

-- CreateIndex
CREATE INDEX "medication_schedules_batchId_idx" ON "medication_schedules"("batchId");

-- CreateIndex
CREATE INDEX "medication_schedules_farmId_idx" ON "medication_schedules"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "farm_settings_farmId_key" ON "farm_settings"("farmId");

-- CreateIndex
CREATE INDEX "farm_settings_farmId_idx" ON "farm_settings"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_settings_farm_id_key" ON "sales_settings"("farm_id");

-- CreateIndex
CREATE INDEX "sales_settings_farm_id_idx" ON "sales_settings"("farm_id");

-- CreateIndex
CREATE INDEX "audit_logs_farm_id_idx" ON "audit_logs"("farm_id");

-- CreateIndex
CREATE INDEX "audit_logs_farm_id_created_at_idx" ON "audit_logs"("farm_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "expenses_expense_date_category_idx" ON "expenses"("expense_date", "category");

-- CreateIndex
CREATE INDEX "expenses_farmId_idx" ON "expenses"("farmId");

-- CreateIndex
CREATE INDEX "expenses_user_id_idx" ON "expenses"("user_id");

-- CreateIndex
CREATE INDEX "expenses_batch_id_idx" ON "expenses"("batch_id");

-- CreateIndex
CREATE INDEX "expenses_supplierId_idx" ON "expenses"("supplierId");

-- CreateIndex
CREATE INDEX "expenses_farmId_is_deleted_idx" ON "expenses"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "expenses_farmId_deleted_at_idx" ON "expenses"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "expense_allocations_batch_id_idx" ON "expense_allocations"("batch_id");

-- CreateIndex
CREATE INDEX "expense_allocations_farm_id_idx" ON "expense_allocations"("farm_id");

-- CreateIndex
CREATE INDEX "expense_allocations_expense_id_idx" ON "expense_allocations"("expense_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_allocations_expense_id_batch_id_key" ON "expense_allocations"("expense_id", "batch_id");

-- CreateIndex
CREATE INDEX "user_permissions_farm_id_idx" ON "user_permissions"("farm_id");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_farm_id_key" ON "user_permissions"("user_id", "farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_farmId_key" ON "subscriptions"("farmId");

-- CreateIndex
CREATE INDEX "subscriptions_farmId_idx" ON "subscriptions"("farmId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "customers_farmId_idx" ON "customers"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoice_number_key" ON "orders"("invoice_number");

-- CreateIndex
CREATE INDEX "orders_order_date_status_idx" ON "orders"("order_date", "status");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_farmId_is_deleted_idx" ON "orders"("farmId", "is_deleted");

-- CreateIndex
CREATE INDEX "orders_farmId_deleted_at_idx" ON "orders"("farmId", "deleted_at");

-- CreateIndex
CREATE INDEX "orders_farmId_status_idx" ON "orders"("farmId", "status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_inventoryId_idx" ON "order_items"("inventoryId");

-- CreateIndex
CREATE INDEX "order_items_livestockId_idx" ON "order_items"("livestockId");

-- CreateIndex
CREATE INDEX "order_item_batch_allocations_order_item_id_idx" ON "order_item_batch_allocations"("order_item_id");

-- CreateIndex
CREATE INDEX "order_item_batch_allocations_batch_id_farm_id_idx" ON "order_item_batch_allocations"("batch_id", "farm_id");

-- CreateIndex
CREATE INDEX "order_item_batch_allocations_farm_id_idx" ON "order_item_batch_allocations"("farm_id");

-- CreateIndex
CREATE INDEX "feed_formulations_farmId_idx" ON "feed_formulations"("farmId");

-- CreateIndex
CREATE INDEX "feed_formulation_ingredients_formulationId_idx" ON "feed_formulation_ingredients"("formulationId");

-- CreateIndex
CREATE INDEX "feed_formulation_ingredients_inventoryId_idx" ON "feed_formulation_ingredients"("inventoryId");

-- CreateIndex
CREATE INDEX "suppliers_farmId_idx" ON "suppliers"("farmId");

-- CreateIndex
CREATE INDEX "egg_categories_farmId_idx" ON "egg_categories"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "device_registrations_licenseKey_key" ON "device_registrations"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "device_registrations_hardware_id_key" ON "device_registrations"("hardware_id");

-- CreateIndex
CREATE INDEX "device_registrations_farm_id_idx" ON "device_registrations"("farm_id");

-- CreateIndex
CREATE INDEX "device_registrations_user_id_idx" ON "device_registrations"("user_id");

-- CreateIndex
CREATE INDEX "device_registrations_license_status_idx" ON "device_registrations"("license_status");

-- CreateIndex
CREATE INDEX "device_registrations_license_expires_at_idx" ON "device_registrations"("license_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_registrations_farm_id_deviceId_key" ON "device_registrations"("farm_id", "deviceId");

-- CreateIndex
CREATE INDEX "admin_license_renewal_log_admin_user_id_created_at_idx" ON "admin_license_renewal_log"("admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_license_renewal_log_device_registration_id_created_at_idx" ON "admin_license_renewal_log"("device_registration_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_license_renewal_log_hardware_id_created_at_idx" ON "admin_license_renewal_log"("hardware_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "manual_license_payments_activation_token_key" ON "manual_license_payments"("activation_token");

-- CreateIndex
CREATE INDEX "manual_license_payments_farm_id_created_at_idx" ON "manual_license_payments"("farm_id", "created_at");

-- CreateIndex
CREATE INDEX "manual_license_payments_admin_user_id_idx" ON "manual_license_payments"("admin_user_id");

-- CreateIndex
CREATE INDEX "manual_license_payments_device_registration_id_idx" ON "manual_license_payments"("device_registration_id");

-- CreateIndex
CREATE INDEX "subscription_events_farm_id_idx" ON "subscription_events"("farm_id");

-- CreateIndex
CREATE INDEX "subscription_events_farm_id_created_at_idx" ON "subscription_events"("farm_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "issued_licenses_activation_token_key" ON "issued_licenses"("activation_token");

-- CreateIndex
CREATE INDEX "issued_licenses_farm_id_issued_at_idx" ON "issued_licenses"("farm_id", "issued_at");

-- CreateIndex
CREATE INDEX "issued_licenses_admin_user_id_issued_at_idx" ON "issued_licenses"("admin_user_id", "issued_at");

-- CreateIndex
CREATE INDEX "issued_licenses_account_user_id_idx" ON "issued_licenses"("account_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_order_id_key" ON "financial_transactions"("order_id");

-- CreateIndex
CREATE INDEX "financial_transactions_farm_id_type_transaction_date_idx" ON "financial_transactions"("farm_id", "type", "transaction_date");

-- CreateIndex
CREATE INDEX "financial_transactions_user_id_idx" ON "financial_transactions"("user_id");

-- CreateIndex
CREATE INDEX "financial_transactions_farm_id_deleted_at_idx" ON "financial_transactions"("farm_id", "deleted_at");

-- CreateIndex
CREATE INDEX "financial_transactions_farm_id_is_deleted_idx" ON "financial_transactions"("farm_id", "is_deleted");

-- CreateIndex
CREATE INDEX "financial_transactions_customer_id_idx" ON "financial_transactions"("customer_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_eggCategoryId_fkey" FOREIGN KEY ("eggCategoryId") REFERENCES "egg_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insert_logs" ADD CONSTRAINT "insert_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delete_logs" ADD CONSTRAINT "delete_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_feeding_logs" ADD CONSTRAINT "daily_feeding_logs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_feeding_logs" ADD CONSTRAINT "daily_feeding_logs_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_feeding_logs" ADD CONSTRAINT "daily_feeding_logs_feed_type_id_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_feeding_logs" ADD CONSTRAINT "daily_feeding_logs_formulation_id_fkey" FOREIGN KEY ("formulation_id") REFERENCES "feed_formulations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_feeding_logs" ADD CONSTRAINT "daily_feeding_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egg_production" ADD CONSTRAINT "egg_production_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egg_production" ADD CONSTRAINT "egg_production_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "egg_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egg_production" ADD CONSTRAINT "egg_production_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egg_production" ADD CONSTRAINT "egg_production_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isolation_rooms" ADD CONSTRAINT "isolation_rooms_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortality" ADD CONSTRAINT "mortality_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortality" ADD CONSTRAINT "mortality_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortality" ADD CONSTRAINT "mortality_isolation_room_id_fkey" FOREIGN KEY ("isolation_room_id") REFERENCES "isolation_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortality" ADD CONSTRAINT "mortality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_schedules" ADD CONSTRAINT "vaccination_schedules_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_schedules" ADD CONSTRAINT "vaccination_schedules_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_settings" ADD CONSTRAINT "farm_settings_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_settings" ADD CONSTRAINT "sales_settings_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_livestockId_fkey" FOREIGN KEY ("livestockId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batch_allocations" ADD CONSTRAINT "order_item_batch_allocations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batch_allocations" ADD CONSTRAINT "order_item_batch_allocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batch_allocations" ADD CONSTRAINT "order_item_batch_allocations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_formulations" ADD CONSTRAINT "feed_formulations_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_formulation_ingredients" ADD CONSTRAINT "feed_formulation_ingredients_formulationId_fkey" FOREIGN KEY ("formulationId") REFERENCES "feed_formulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_formulation_ingredients" ADD CONSTRAINT "feed_formulation_ingredients_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egg_categories" ADD CONSTRAINT "egg_categories_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_registrations" ADD CONSTRAINT "device_registrations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_registrations" ADD CONSTRAINT "device_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_license_renewal_log" ADD CONSTRAINT "admin_license_renewal_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_license_renewal_log" ADD CONSTRAINT "admin_license_renewal_log_device_registration_id_fkey" FOREIGN KEY ("device_registration_id") REFERENCES "device_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_license_payments" ADD CONSTRAINT "manual_license_payments_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_license_payments" ADD CONSTRAINT "manual_license_payments_device_registration_id_fkey" FOREIGN KEY ("device_registration_id") REFERENCES "device_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_license_payments" ADD CONSTRAINT "manual_license_payments_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_licenses" ADD CONSTRAINT "issued_licenses_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_licenses" ADD CONSTRAINT "issued_licenses_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_licenses" ADD CONSTRAINT "issued_licenses_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

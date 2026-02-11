<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\User;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define default roles with hierarchy levels
        $roles = [
            [
                'name' => 'superadmin',
                'display_name' => 'Super Admin',
                'description' => 'Full system access, can manage everything',
                'level' => 100,
            ],
            [
                'name' => 'kepala_madrasah',
                'display_name' => 'Kepala Madrasah',
                'description' => 'School principal with oversight and approval authority',
                'level' => 90,
            ],
            [
                'name' => 'waka_kurikulum',
                'display_name' => 'Wakil Kepala Kurikulum',
                'description' => 'Vice principal for curriculum affairs',
                'level' => 80,
            ],
            [
                'name' => 'waka_kesiswaan',
                'display_name' => 'Wakil Kepala Kesiswaan',
                'description' => 'Vice principal for student affairs',
                'level' => 80,
            ],
            [
                'name' => 'wali_kelas',
                'display_name' => 'Wali Kelas',
                'description' => 'Class homeroom teacher',
                'level' => 50,
            ],
            [
                'name' => 'guru',
                'display_name' => 'Guru',
                'description' => 'Regular teacher',
                'level' => 10,
            ],
        ];

        // Create roles
        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );
        }

        $this->command->info('Default roles created successfully!');

        // Migrate existing users to new role system
        $this->migrateExistingUsers();
    }

    /**
     * Migrate existing users' legacy roles to the new system
     */
    private function migrateExistingUsers(): void
    {
        $users = User::all();
        $migrated = 0;

        foreach ($users as $user) {
            // Skip if user already has roles assigned
            if ($user->roles()->count() > 0) {
                continue;
            }

            // Map legacy role to new role
            $legacyRole = $user->role;
            $newRoleName = $this->mapLegacyRole($legacyRole);

            if ($newRoleName) {
                $user->assignRole($newRoleName);
                $migrated++;
            }
        }

        if ($migrated > 0) {
            $this->command->info("Migrated {$migrated} users to new role system.");
        }
    }

    /**
     * Map legacy role names to new role names
     */
    private function mapLegacyRole(string $legacyRole): ?string
    {
        $mapping = [
            'superadmin' => 'superadmin',
            'operator' => 'superadmin', // Operators become superadmin
            'kepala_sekolah' => 'kepala_madrasah',
            'guru' => 'guru',
        ];

        return $mapping[$legacyRole] ?? null;
    }
}

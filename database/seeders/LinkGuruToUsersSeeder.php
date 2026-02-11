<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Guru;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class LinkGuruToUsersSeeder extends Seeder
{
    /**
     * Link existing guru records to user accounts.
     * Creates new user accounts for guru without linked users.
     */
    public function run(): void
    {
        $guruRole = Role::where('name', 'guru')->first();

        if (!$guruRole) {
            $this->command->info('Guru role not found. Please run RoleSeeder first.');
            return;
        }

        $guruRecords = Guru::whereNull('user_id')->get();

        $this->command->info("Found {$guruRecords->count()} guru records without user links");

        foreach ($guruRecords as $guru) {
            DB::beginTransaction();
            try {
                // Check if user with same username already exists
                $existingUser = User::where('username', $guru->username)->first();

                if ($existingUser) {
                    // Link to existing user
                    $guru->update(['user_id' => $existingUser->id]);

                    // Ensure user has guru role
                    if (!$existingUser->roles()->where('name', 'guru')->exists()) {
                        $existingUser->roles()->attach($guruRole->id);
                    }

                    $this->command->info("Linked guru '{$guru->nama}' to existing user #{$existingUser->id}");
                } else {
                    // Create new user
                    $user = User::create([
                        'name' => $guru->nama,
                        'username' => $guru->username,
                        'password' => $guru->password, // Already hashed
                        'is_active' => $guru->status === 'Aktif',
                    ]);

                    // Assign guru role
                    $user->roles()->attach($guruRole->id);

                    // Link guru to user
                    $guru->update(['user_id' => $user->id]);

                    $this->command->info("Created user and linked for guru '{$guru->nama}'");
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                $this->command->error("Error linking guru '{$guru->nama}': " . $e->getMessage());
            }
        }

        $this->command->info('Guru-User linking completed!');
    }
}

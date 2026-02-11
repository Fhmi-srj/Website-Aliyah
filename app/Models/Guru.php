<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guru extends Model
{
    use HasFactory;

    protected $table = 'guru';

    protected $fillable = [
        'user_id',
        'username',
        'password',
        'nama',
        'nip',
        'email',
        'sk',
        'jenis_kelamin',
        'tempat_lahir',
        'tanggal_lahir',
        'alamat',
        'pendidikan',
        'kontak',
        'tmt',
        'jabatan',
        'status',
        'foto',
        'ttd',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'tanggal_lahir' => 'date',
        'tmt' => 'date',
    ];

    /**
     * Get the user account linked to this guru.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the jadwal for this guru.
     */
    public function jadwal()
    {
        return $this->hasMany(Jadwal::class);
    }
}


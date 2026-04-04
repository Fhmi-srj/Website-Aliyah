<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cbt_question_banks', function (Blueprint $table) {
            $table->id();
            $table->string('kode_bank')->unique();
            $table->foreignId('mapel_id')->constrained('mapel')->onDelete('cascade');
            $table->foreignId('guru_id')->constrained('guru')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('cbt_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_bank_id')->constrained('cbt_question_banks')->onDelete('cascade');
            $table->string('name');
            $table->integer('duration_minutes')->default(60);
            $table->dateTime('start_time')->nullable();
            $table->dateTime('end_time')->nullable();
            $table->string('token')->nullable();
            $table->boolean('randomize_questions')->default(false);
            $table->boolean('randomize_options')->default(false);
            $table->enum('status', ['draft', 'published', 'finished'])->default('draft');
            $table->timestamps();
        });

        Schema::create('cbt_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_bank_id')->constrained('cbt_question_banks')->onDelete('cascade');
            $table->enum('type', ['multiple_choice', 'essay', 'matching', 'ms_choice']); 
            $table->text('content');
            $table->json('options')->nullable(); 
            $table->json('correct_answer')->nullable(); 
            $table->decimal('weight', 5, 2)->default(1.00); 
            $table->timestamps();
        });

        Schema::create('cbt_student_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('cbt_exams')->onDelete('cascade');
            $table->foreignId('siswa_id')->constrained('siswa')->onDelete('cascade');
            $table->enum('status', ['not_started', 'ongoing', 'finished'])->default('not_started');
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->decimal('score', 8, 2)->nullable();
            $table->json('fraud_logs')->nullable();
            $table->json('snapshot_urls')->nullable();
            $table->timestamps();
        });

        Schema::create('cbt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_exam_id')->constrained('cbt_student_exams')->onDelete('cascade');
            $table->foreignId('question_id')->constrained('cbt_questions')->onDelete('cascade');
            $table->text('answer')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->decimal('score_awarded', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cbt_answers');
        Schema::dropIfExists('cbt_student_exams');
        Schema::dropIfExists('cbt_questions');
        Schema::dropIfExists('cbt_exams');
        Schema::dropIfExists('cbt_question_banks');
    }
};

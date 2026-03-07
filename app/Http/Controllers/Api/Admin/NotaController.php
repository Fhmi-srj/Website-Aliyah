<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotaTemplate;
use App\Models\NotaHistory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotaController extends Controller
{
    // ── Templates CRUD ──────────────────────────────────────────────

    public function getTemplates(): JsonResponse
    {
        $templates = NotaTemplate::orderBy('nama')->get();
        return response()->json($templates);
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'fields' => 'required|array',
            'fields.*.key' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.type' => 'required|in:text,number,date,textarea,select',
            'fields.*.required' => 'boolean',
            'fields.*.options' => 'nullable|array',
            'layout_html' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $template = NotaTemplate::create($validated);
        return response()->json($template, 201);
    }

    public function updateTemplate(Request $request, $id): JsonResponse
    {
        $template = NotaTemplate::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'sometimes|string|max:255',
            'fields' => 'sometimes|array',
            'fields.*.key' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.type' => 'required|in:text,number,date,textarea,select',
            'fields.*.required' => 'boolean',
            'fields.*.options' => 'nullable|array',
            'layout_html' => 'sometimes|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $template->update($validated);
        return response()->json($template);
    }

    public function deleteTemplate($id): JsonResponse
    {
        $template = NotaTemplate::findOrFail($id);
        $template->delete();
        return response()->json(['message' => 'Template berhasil dihapus']);
    }

    // ── Generate & History ──────────────────────────────────────────

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nota_template_id' => 'required|exists:nota_templates,id',
            'data' => 'required|array',
        ]);

        $history = NotaHistory::create([
            'nota_template_id' => $validated['nota_template_id'],
            'data' => $validated['data'],
            'created_by' => $request->user()?->id,
        ]);

        $history->load('template');
        return response()->json($history, 201);
    }

    public function getHistory(Request $request): JsonResponse
    {
        $query = NotaHistory::with('template', 'creator')
            ->orderBy('created_at', 'desc');

        if ($request->has('template_id')) {
            $query->where('nota_template_id', $request->template_id);
        }

        $history = $query->paginate(20);
        return response()->json($history);
    }

    public function getHistoryItem($id): JsonResponse
    {
        $item = NotaHistory::with('template')->findOrFail($id);
        return response()->json($item);
    }

    public function deleteHistory($id): JsonResponse
    {
        $item = NotaHistory::findOrFail($id);
        $item->delete();
        return response()->json(['message' => 'Riwayat nota berhasil dihapus']);
    }

    // ── Print page ─────────────────────────────────────────────────

    public function printNota($id)
    {
        $history = NotaHistory::with('template')->findOrFail($id);
        $template = $history->template;
        $data = $history->data;

        // Replace placeholders in layout HTML
        $html = $template->layout_html;
        foreach ($data as $key => $value) {
            $html = str_replace('{' . $key . '}', htmlspecialchars($value ?? ''), $html);
        }

        return view('nota.print', [
            'html' => $html,
            'template' => $template,
            'data' => $data,
        ]);
    }
}

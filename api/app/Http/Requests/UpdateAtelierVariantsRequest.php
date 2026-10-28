<?php

namespace App\Http\Requests;

use App\Models\AtelierVariant;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateAtelierVariantsRequest extends FormRequest
{
    public const MAX_POKEMON = 100;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'variants' => ['present', 'array', 'list', 'max:'.AtelierVariant::MAX_PER_POKEMON],
            ...self::variantRules('variants.*'),
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                self::checkVariants($validator, 'variants', $this->input('variants'));
                $pokemon = $this->route('pokemon');
                $owned = $this->user()->atelierVariants()->distinct()->pluck('pokemon');
                if ($this->input('variants') && ! $owned->contains($pokemon) && $owned->count() >= self::MAX_POKEMON) {
                    $validator->errors()->add('variants', 'Ton Atelier a déjà des variantes pour '.self::MAX_POKEMON.' Pokémon.');
                }
            },
        ];
    }

    /**
     * Règles d'une variante, pour chaque élément désigné par $path (motif avec *).
     *
     * @return array<string, array<mixed>>
     */
    public static function variantRules(string $path): array
    {
        $id = 'regex:/^[a-z0-9]+$/';
        $rules = [
            "{$path}.name" => ['required', 'string', 'max:30'],
            "{$path}.item" => ['nullable', 'string', 'max:40', $id],
            "{$path}.nature" => ['required', 'string', 'max:20', $id],
            "{$path}.moves" => ['required', 'array', 'list', 'size:'.AtelierVariant::MOVE_SLOTS],
            "{$path}.moves.*" => ['nullable', 'string', 'max:40', $id],
            "{$path}.evs" => ['required', 'array:'.implode(',', AtelierVariant::STATS)],
            "{$path}.ivs" => ['required', 'array:'.implode(',', AtelierVariant::STATS)],
            "{$path}.favorite" => ['required', 'boolean'],
            "{$path}.preset" => ['nullable', Rule::in(AtelierVariant::PRESETS)],
        ];
        foreach (AtelierVariant::STATS as $stat) {
            $rules["{$path}.evs.{$stat}"] = ['required', 'integer', 'between:0,'.AtelierVariant::MAX_EV];
            $rules["{$path}.ivs.{$stat}"] = ['required', 'integer', 'between:0,'.AtelierVariant::MAX_IV];
        }

        return $rules;
    }

    /**
     * Total des EV et favorite unique, sur la liste de variantes d'un Pokémon.
     */
    public static function checkVariants(Validator $validator, string $path, mixed $variants): void
    {
        if (! is_array($variants)) {
            return;
        }
        $favorites = 0;
        foreach ($variants as $index => $variant) {
            $evs = is_array($variant['evs'] ?? null) ? $variant['evs'] : [];
            if (array_sum(array_map(intval(...), $evs)) > AtelierVariant::MAX_EV_TOTAL) {
                $validator->errors()->add("{$path}.{$index}.evs", 'Pas plus de '.AtelierVariant::MAX_EV_TOTAL.' EV au total.');
            }
            $favorites += filter_var($variant['favorite'] ?? false, FILTER_VALIDATE_BOOL) ? 1 : 0;
        }
        if ($favorites > 1) {
            $validator->errors()->add($path, 'Une seule variante favorite par Pokémon.');
        }
    }
}

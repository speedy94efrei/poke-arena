<?php

namespace App\Http\Requests;

use App\Ranked\Banners;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateBannerRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'banner' => ['required', 'string', Rule::in(array_keys(config('ranked.banners')))],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(Banners $banners): array
    {
        return [
            function (Validator $validator) use ($banners): void {
                if (! $validator->errors()->has('banner') && ! $banners->isUnlocked($this->user(), $this->string('banner'))) {
                    $validator->errors()->add('banner', 'Cette bannière est encore verrouillée.');
                }
            },
        ];
    }
}

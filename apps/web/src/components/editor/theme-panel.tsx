'use client';

import { FONT_STACKS, PageRenderer } from '@moonlight/renderer';
import {
  BACKGROUND_TYPES,
  BUTTON_SHAPES,
  BUTTON_STYLES,
  DEFAULT_THEME,
  FONT_IDS,
  RADII,
  SPACINGS,
  THEME_LABELS,
  THEME_PRESETS,
  WIDTHS,
  samplePage,
  type Theme,
} from '@moonlight/schemas';
import { mixHex } from '@/lib/page-editor';
import { ColorField, OptionRow, TextField } from './fields';
import { ImageField } from './image-field';

type Labels = Record<string, string>;

function options<T extends string>(values: readonly T[], labels: Labels) {
  return values.map((value) => ({ value, label: labels[value] }));
}

function matchesPreset(theme: Theme, preset: Theme) {
  return (Object.keys(preset) as (keyof Theme)[]).every((key) => theme[key] === preset[key]);
}

export function ThemePanel({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const set = (patch: Partial<Theme>) => onChange({ ...theme, ...patch });

  const setBackgroundType = (backgroundType: Theme['backgroundType']) => {
    if (backgroundType === 'gradient' && !theme.backgroundEnd) {
      set({ backgroundType, backgroundEnd: mixHex(theme.background, theme.primaryColor, 0.28) });
      return;
    }
    set({ backgroundType });
  };

  return (
    <div>
      <fieldset>
        <legend>Temas prontos</legend>
        <div className="preset-grid">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="preset-option"
              aria-pressed={matchesPreset(theme, preset.theme)}
              onClick={() => onChange({ ...preset.theme })}
            >
              <span className="preset-thumb" aria-hidden="true">
                <span className="preset-thumb-inner" style={{ display: 'block' }}>
                  <PageRenderer content={samplePage(preset.theme)} fill="container" />
                </span>
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Cores</legend>
        <ColorField
          label="Cor principal"
          value={theme.primaryColor}
          onChange={(primaryColor) => set({ primaryColor })}
        />
        <ColorField
          label={theme.backgroundType === 'gradient' ? 'Cor de fundo (início)' : 'Cor de fundo'}
          value={theme.background}
          onChange={(background) => set({ background })}
        />
        <label className="switch" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={theme.textColor === undefined}
            onChange={(event) =>
              set({ textColor: event.target.checked ? undefined : (theme.textColor ?? '#111827') })
            }
          />
          Cor do texto automática
        </label>
        {theme.textColor !== undefined && (
          <ColorField
            label="Cor do texto"
            value={theme.textColor}
            onChange={(textColor) => set({ textColor })}
          />
        )}
        {theme.textColor === undefined && (
          <p className="hint">
            O texto escolhe claro ou escuro conforme o fundo, para ficar legível.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>Fundo</legend>
        <OptionRow
          label="Tipo de fundo"
          value={theme.backgroundType}
          options={options(BACKGROUND_TYPES, THEME_LABELS.backgroundType)}
          onChange={setBackgroundType}
        />
        {theme.backgroundType === 'gradient' && (
          <ColorField
            label="Cor de fundo (fim do degradê)"
            value={theme.backgroundEnd ?? theme.background}
            onChange={(backgroundEnd) => set({ backgroundEnd })}
          />
        )}
        {theme.backgroundType === 'image' && (
          <ImageField
            label="Imagem de fundo"
            value={theme.backgroundImageUrl}
            hint="A imagem recebe uma camada da cor de fundo para manter o texto legível."
            onChange={(backgroundImageUrl) => set({ backgroundImageUrl })}
          />
        )}
      </fieldset>

      <fieldset>
        <legend>Tipografia</legend>
        <OptionRow
          label="Fonte"
          value={theme.font}
          options={options(FONT_IDS, THEME_LABELS.font)}
          onChange={(font) => set({ font })}
          renderOption={(option) => (
            <span style={{ fontFamily: FONT_STACKS[option.value] }}>
              <strong style={{ fontSize: '1.05em' }}>Aa</strong> {option.label}
            </span>
          )}
        />
      </fieldset>

      <fieldset>
        <legend>Botões e formas</legend>
        <OptionRow
          label="Estilo do botão"
          value={theme.buttonStyle}
          options={options(BUTTON_STYLES, THEME_LABELS.buttonStyle)}
          onChange={(buttonStyle) => set({ buttonStyle })}
        />
        <OptionRow
          label="Formato do botão"
          value={theme.buttonShape}
          options={options(BUTTON_SHAPES, THEME_LABELS.buttonShape)}
          onChange={(buttonShape) => set({ buttonShape })}
        />
        <OptionRow
          label="Cantos arredondados"
          value={theme.radius}
          options={options(RADII, THEME_LABELS.radius)}
          onChange={(radius) => set({ radius })}
        />
      </fieldset>

      <fieldset>
        <legend>Layout</legend>
        <OptionRow
          label="Espaçamento entre blocos"
          value={theme.spacing}
          options={options(SPACINGS, THEME_LABELS.spacing)}
          onChange={(spacing) => set({ spacing })}
        />
        <OptionRow
          label="Largura do conteúdo"
          value={theme.width}
          options={options(WIDTHS, THEME_LABELS.width)}
          onChange={(width) => set({ width })}
        />
      </fieldset>

      <button type="button" className="btn-ghost" onClick={() => onChange({ ...DEFAULT_THEME })}>
        Restaurar tema padrão
      </button>
    </div>
  );
}

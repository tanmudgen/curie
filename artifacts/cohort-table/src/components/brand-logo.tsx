type BrandLogoProps = {
  className?: string;
  tone?: 'dark' | 'light';
};

export function BrandLogo({ className, tone = 'dark' }: BrandLogoProps) {
  const file = tone === 'light' ? 'tga-logo-light.svg' : 'tga-logo.svg';
  return (
    <img
      src={`${import.meta.env.BASE_URL}brand/${file}`}
      alt="The Gen Academy"
      className={className}
    />
  );
}

import { Tag, type TagProps, Tooltip } from "@navikt/ds-react";
import { useRef, useState } from "react";

interface AvkortetTagProps extends Omit<TagProps, "children"> {
  children: string;
}

/**
 * Tag som holder seg på én linje. Lang tekst avkortes med ellipse, og hele teksten
 * vises i et tooltip, men bare når teksten faktisk er avkortet.
 *
 * Taggen blir aldri bredere enn forelderen. Send inn f.eks. `className="max-w-48"`
 * der forelderen ikke begrenser bredden, som i tabellceller.
 */
export function AvkortetTag({ children, className, ...props }: AvkortetTagProps) {
  const tekstRef = useRef<HTMLSpanElement>(null);
  const [åpen, setÅpen] = useState(false);

  const erAvkortet = () => {
    const tekst = tekstRef.current;
    return tekst !== null && tekst.scrollWidth > tekst.clientWidth;
  };

  return (
    <Tooltip
      content={children}
      open={åpen}
      onOpenChange={(nyÅpen) => setÅpen(nyÅpen && erAvkortet())}
    >
      <Tag {...props} className={["max-w-full", className].filter(Boolean).join(" ")}>
        <span ref={tekstRef} className="truncate">
          {children}
        </span>
      </Tag>
    </Tooltip>
  );
}

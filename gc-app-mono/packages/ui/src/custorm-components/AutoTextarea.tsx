import { Textarea } from "@gc/ui/components/textarea.tsx";
import {
  ComponentPropsWithoutRef,
  FormEvent,
  forwardRef,
  useCallback,
  useRef,
} from "react";
import { cn } from "@gc/lib/utils";

export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(({ className, ...props }, ref) => {
  const preRef = useRef<HTMLPreElement>(null);
  const forwardInputEvent = useCallback(
    (event: FormEvent<HTMLTextAreaElement>) => {
      preRef.current!.textContent = event.currentTarget.value;
      let height = preRef.current!.offsetHeight;
      event.currentTarget.style.height = `${height}px`;
      props.onInput?.(event);
    },
    [props.onInput],
  );
  return (
    <div className={cn("relative", className, "p-0")}>
      <pre
        ref={preRef}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "invisible absolute -z-50 break-words whitespace-pre-wrap",
          className,
        )}
      />
      <Textarea
        onInput={forwardInputEvent}
        ref={ref}
        className={className}
        {...props}
      />
    </div>
  );
});

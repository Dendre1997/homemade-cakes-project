import Image from "next/image";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableImage({ url, index, handleRemoveImage }: { url: string, index: number, handleRemoveImage: (index: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: url });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative w-36 h-36 rounded-md overflow-hidden border-4 ${
        index === 0 ? "border-background" : "border-transparent"
      }`}
    >
      <Image
        src={url}
        alt="Uploaded image"
        layout="fill"
        className="object-cover"
      />
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          handleRemoveImage(index);
        }}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none hover:bg-red-700 transition-colors z-10"
        aria-label="Remove image"
      >
        &times;
      </button>
      {index === 0 && (
        <div className="absolute bottom-0 w-full bg-black bg-opacity-50 text-white text-xs text-center py-0.5">
          Cover
        </div>
      )}
    </div>
  );
}

export default SortableImage
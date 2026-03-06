import { useEffect, useRef } from "react";

export const useRenderCount = () => {
	const rendersNo = useRef(0);

	useEffect(() => {
		rendersNo.current++;
	}); // Note: No dependency array to run on every render

	return rendersNo.current;
};

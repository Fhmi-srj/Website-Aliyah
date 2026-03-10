import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - scrolls a container (ref) or window to top on route change.
 * Usage: <ScrollToTop containerRef={mainRef} />
 */
export default function ScrollToTop({ containerRef }) {
    const { pathname } = useLocation();

    useEffect(() => {
        if (containerRef?.current) {
            containerRef.current.scrollTo(0, 0);
        } else {
            window.scrollTo(0, 0);
        }
    }, [pathname, containerRef]);

    return null;
}

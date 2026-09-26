import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/** Generic Hive mark (same path as Bluz's GenericHiveLogo); fallback when Hive's own icon can't load. */
export default function HiveGenericIcon(props: SvgIconProps)
{
    return (
        <SvgIcon viewBox="0 0 240 240" { ...props }>
            <path
                fillRule="evenodd"
                d="M 148.967056 222 L 210.802826 53.229431 L 222.570404 60.019608 L 222.570404 179.510803 L 148.967056 222 Z M 85.152496 219.667374 L 15.589753 179.510803 L 15.589753 60.019608 L 24.732841 54.749954 L 85.152496 219.667374 Z M 117.497192 178.42749 L 68.990486 29.193939 L 119.079704 0.263672 L 166.482452 27.631714 L 117.497192 178.42749 Z"
            />
        </SvgIcon>
    );
}

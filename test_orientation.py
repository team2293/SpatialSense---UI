"""
Test script: parse orientation metadata from PLY header and use it to set the viewer camera.
Usage: python3 test_orientation.py pointcloud-4-test.ply
"""
import sys
import numpy as np
import open3d as o3d


def parse_ply_orientation(ply_path: str):
    """Read the PLY header and extract first_frame_quat and first_frame_position."""
    quat = None
    position = None
    with open(ply_path, "rb") as f:
        for raw_line in f:
            line = raw_line.decode("ascii", errors="ignore").strip()
            if line == "end_header":
                break
            if line.startswith("comment first_frame_quat"):
                parts = line.split()
                quat = np.array([float(parts[2]), float(parts[3]),
                                 float(parts[4]), float(parts[5])])
            elif line.startswith("comment first_frame_position"):
                parts = line.split()
                position = np.array([float(parts[2]), float(parts[3]),
                                     float(parts[4])])
    return quat, position


def quat_xyzw_to_rotmat(q: np.ndarray) -> np.ndarray:
    """Convert quaternion (x, y, z, w) to a 3x3 rotation matrix."""
    x, y, z, w = q / np.linalg.norm(q)
    return np.array([
        [1 - 2*(y*y + z*z),   2*(x*y - w*z),     2*(x*z + w*y)],
        [2*(x*y + w*z),       1 - 2*(x*x + z*z), 2*(y*z - w*x)],
        [2*(x*z - w*y),       2*(y*z + w*x),      1 - 2*(x*x + y*y)],
    ])


def main():
    ply_path = sys.argv[1] if len(sys.argv) > 1 else "pointcloud-4-test.ply"

    # Load point cloud
    pcd = o3d.io.read_point_cloud(ply_path)
    pts = np.asarray(pcd.points)
    center = pts.mean(axis=0)
    extent = np.ptp(pts, axis=0).max()
    print(f"Loaded {len(pts)} points, center={center}, extent={extent:.2f}")

    # Parse orientation from header
    quat, position = parse_ply_orientation(ply_path)
    print(f"Quaternion (x,y,z,w): {quat}")
    print(f"Position: {position}")

    if quat is not None:
        R = quat_xyzw_to_rotmat(quat)
        print(f"Rotation matrix:\n{R}")

        # Use the rotation to define camera orientation
        # Column 0 = right, Column 1 = forward, Column 2 = up
        up = R[:, 2]
        front = -R[:, 1]  # camera looks along -Y of the basis
    else:
        print("No orientation metadata found, using defaults")
        up = np.array([0.0, 0.0, 1.0])
        front = np.array([0.0, -1.0, 0.0])

    print(f"\nCamera UP:    {up}")
    print(f"Camera FRONT: {front}")

    # Visualize
    vis = o3d.visualization.Visualizer()
    vis.create_window(width=1280, height=720)
    vis.add_geometry(pcd)

    # Add origin marker
    frame = o3d.geometry.TriangleMesh.create_coordinate_frame(size=0.3)
    vis.add_geometry(frame)

    ctr = vis.get_view_control()
    ctr.set_lookat(center)
    ctr.set_front(front)
    ctr.set_up(up)
    ctr.set_zoom(0.08)

    vis.get_render_option().point_size = 2.0
    vis.get_render_option().background_color = np.array([0.125, 0.125, 0.125])
    vis.run()
    vis.destroy_window()


if __name__ == "__main__":
    main()

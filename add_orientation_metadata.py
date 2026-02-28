"""
Run this AFTER stitching the point cloud, BEFORE sending the PLY.
Detects floor and wall planes using RANSAC, then writes orientation
metadata into the PLY header.

Usage: python3 add_orientation_metadata.py input.ply output.ply
"""
import sys
import numpy as np
import open3d as o3d


def detect_orientation(ply_path):
    pcd = o3d.io.read_point_cloud(ply_path)
    pts = np.asarray(pcd.points)

    # Find floor plane (biggest plane)
    plane1, inliers1 = pcd.segment_plane(distance_threshold=0.02, ransac_n=3, num_iterations=1000)
    up = np.array(plane1[:3])
    up = up / np.linalg.norm(up)
    if up[2] < 0:  # make sure up points "up" (positive Z in most cameras)
        up = -up

    # Remove floor points, find wall plane (next biggest)
    remaining = pcd.select_by_index(inliers1, invert=True)
    plane2, _ = remaining.segment_plane(distance_threshold=0.02, ransac_n=3, num_iterations=1000)
    wall = np.array(plane2[:3])
    wall = wall / np.linalg.norm(wall)

    # Make wall perpendicular to up
    wall = wall - np.dot(wall, up) * up
    wall = wall / np.linalg.norm(wall)

    return up, wall


def inject_metadata(input_ply, output_ply, up, wall):
    with open(input_ply, 'rb') as f:
        data = f.read()

    header_end = data.index(b'end_header\n')
    header = data[:header_end].decode('ascii')
    body = data[header_end:]

    metadata = (
        f'\ncomment === ORIENTATION METADATA ===\n'
        f'comment up_vector {up[0]:.4f} {up[1]:.4f} {up[2]:.4f}\n'
        f'comment primary_wall_normal {wall[0]:.4f} {wall[1]:.4f} {wall[2]:.4f}\n'
        f'comment units meters\n'
        f'comment scene_type indoor\n'
    )

    with open(output_ply, 'wb') as f:
        f.write((header + metadata).encode('ascii') + body)


if __name__ == '__main__':
    input_ply = sys.argv[1]
    output_ply = sys.argv[2] if len(sys.argv) > 2 else input_ply

    up, wall = detect_orientation(input_ply)
    print(f'Up vector:   {up}')
    print(f'Wall normal: {wall}')

    inject_metadata(input_ply, output_ply, up, wall)
    print(f'Saved: {output_ply}')

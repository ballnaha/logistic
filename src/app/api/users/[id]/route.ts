import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - ดึงข้อมูลผู้ใช้งานเดี่ยว
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้' },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตข้อมูลผู้ใช้งาน
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์ - admin หรือแก้ไขข้อมูลตัวเองได้
    if (session.user.role !== 'admin' && parseInt(session.user.id) !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, email, firstName, lastName, role, isActive } = body;

    // ตรวจสอบว่าผู้ใช้งานมีอยู่หรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    // ตรวจสอบ username ซ้ำ (ถ้าเปลี่ยน username)
    if (username && username !== existingUser.username) {
      const duplicateUser = await prisma.user.findUnique({
        where: { username },
      });

      if (duplicateUser) {
        return NextResponse.json(
          { error: 'Username นี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    // เตรียมข้อมูลสำหรับอัปเดต
    const updateData: any = {};

    if (username) updateData.username = username;
    if (email !== undefined) updateData.email = email || null;
    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;

    // เฉพาะ admin เท่านั้นที่แก้ไข role และ isActive ได้
    if (session.user.role === 'admin') {
      if (role) updateData.role = role;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
    }

    // เข้ารหัสรหัสผ่านใหม่ (ถ้ามี)
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // อัปเดตข้อมูล
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตข้อมูลผู้ใช้งานได้' },
      { status: 500 }
    );
  }
}

// DELETE - ลบผู้ใช้งาน (permanent delete หรือ soft delete ตาม query parameter)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // เฉพาะ admin เท่านั้นที่ลบได้
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // ตรวจสอบ query parameter สำหรับ permanent delete
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // ตรวจสอบว่าผู้ใช้งานมีอยู่หรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    // ป้องกันการลบตัวเอง
    if (parseInt(session.user.id) === userId) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบบัญชีตัวเองได้' },
        { status: 400 }
      );
    }

    if (permanent) {
      // Hard delete - ลบจริงออกจากฐานข้อมูล
      await prisma.user.delete({
        where: { id: userId },
      });

      return NextResponse.json({
        success: true,
        message: 'ลบผู้ใช้งานสำเร็จ',
      });
    } else {
      // Soft delete - เปลี่ยนสถานะเป็นไม่ใช้งาน
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'ปิดใช้งานผู้ใช้งานสำเร็จ',
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดำเนินการได้' },
      { status: 500 }
    );
  }
}

// PATCH - เปิดใช้งานผู้ใช้งานคืน
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // เฉพาะ admin เท่านั้นที่เปิดใช้งานคืนได้
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // ตรวจสอบว่าผู้ใช้งานมีอยู่หรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    if (existingUser.isActive) {
      return NextResponse.json(
        { error: 'ผู้ใช้งานนี้ใช้งานอยู่แล้ว' },
        { status: 400 }
      );
    }

    // เปิดใช้งานคืน
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'เปิดใช้งานผู้ใช้งานสำเร็จ',
    });
  } catch (error) {
    console.error('Error reactivating user:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถเปิดใช้งานผู้ใช้งานได้' },
      { status: 500 }
    );
  }
}

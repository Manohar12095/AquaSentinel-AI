import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc

from ..db import get_db
from ..models import BlogPost, User
from ..schemas import BlogPostCreate, BlogPostOut, BlogPostModerate
from .auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[BlogPostOut])
async def get_blog_posts(db: AsyncSession = Depends(get_db)):
    stmt = select(BlogPost).options(selectinload(BlogPost.author)).order_by(desc(BlogPost.created_at))
    result = await db.execute(stmt)
    posts = result.scalars().all()
    
    out = []
    for p in posts:
        p_out = BlogPostOut.model_validate(p)
        p_out.author_name = p.author.name if p.author else "Unknown"
        p_out.tags = json.loads(p.tags_json) if p.tags_json else []
        p_out.references = json.loads(p.references_json) if p.references_json else []
        out.append(p_out)
        
    return out

@router.post("", response_model=BlogPostOut)
async def create_blog_post(
    post_in: BlogPostCreate, 
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Set to pending if researcher, published if admin/operator
    status = "published" if user.role in ["admin", "operator"] else "pending"
    
    post = BlogPost(
        author_id=user.id,
        title=post_in.title,
        body_md=post_in.body_md,
        tags_json=json.dumps(post_in.tags),
        status=status
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
    out = BlogPostOut.model_validate(post)
    out.author_name = user.name
    out.tags = post_in.tags
    out.references = []
    return out

@router.put("/{post_id}", response_model=BlogPostOut)
async def update_blog_post(
    post_id: int,
    post_in: BlogPostCreate, 
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BlogPost).where(BlogPost.id == post_id)
    result = await db.execute(stmt)
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if post.author_id != user.id and user.role not in ["admin", "operator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    post.title = post_in.title
    post.body_md = post_in.body_md
    post.tags_json = json.dumps(post_in.tags)
    
    if user.role not in ["admin", "operator"]:
        post.status = "pending"
        
    await db.commit()
    await db.refresh(post)
    
    out = BlogPostOut.model_validate(post)
    out.author_name = user.name # Simplification
    out.tags = post_in.tags
    out.references = json.loads(post.references_json) if post.references_json else []
    return out

@router.post("/{post_id}/moderate")
async def moderate_blog_post(
    post_id: int,
    mod: BlogPostModerate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.role not in ["admin", "operator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    stmt = select(BlogPost).where(BlogPost.id == post_id)
    result = await db.execute(stmt)
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if mod.action == "publish":
        post.status = "published"
    elif mod.action == "reject":
        post.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    await db.commit()
    return {"status": "ok"}
